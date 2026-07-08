import type { Plan, PlanStatus, Step } from "../domain/types.js";
import { findPlanById, updatePlanStatus } from "../repositories/plan.repository.js";
import { deleteStep, findStepById, getStepRelatedCounts } from "../repositories/step.repository.js";
import { planNextUri, planStepsUri, planUri, stepUri, userFacingLinks } from "../resources/uris.js";
import type { NextAction } from "../resources/views.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function stepDeleteHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const stepId = String(args.stepId);
  assertConfirmation(args.confirmDeleteRelatedData);

  const deleted = context.db.transaction(() => {
    const step = requireStep(context, stepId);
    const plan = requirePlan(context, step.planId);
    const counts = getStepRelatedCounts(context.db, step.id);
    const nextPlanStatus: PlanStatus = "draft";
    if (nextPlanStatus !== plan.status) {
      updatePlanStatus(context.db, plan.id, nextPlanStatus, null);
    }
    const stepsDeleted = deleteStep(context.db, step.id);
    if (stepsDeleted !== 1) {
      throw new Error("Step disappeared during deletion.");
    }
    return {
      step,
      plan,
      counts,
      planStatus: nextPlanStatus,
      plansUpdated: nextPlanStatus === plan.status ? 0 : 1
    };
  })();

  return {
    ok: true,
    message: "Step and related workflow data were deleted.",
    changed: {
      stepsDeleted: 1,
      notesDeleted: deleted.counts.notes,
      transitionsDeleted: deleted.counts.transitions,
      attachmentsDeleted: deleted.counts.attachments,
      plansUpdated: deleted.plansUpdated
    },
    resources: {
      deletedStepUri: stepUri(deleted.step.id),
      planUri: planUri(deleted.plan.id),
      stepsUri: planStepsUri(deleted.plan.id),
      nextUri: planNextUri(deleted.plan.id)
    },
    links: userFacingLinks(context.publicUrl, deleted.plan.id),
    state: {
      stepId: deleted.step.id,
      planId: deleted.plan.id,
      previousPlanStatus: deleted.plan.status,
      planStatus: deleted.planStatus,
      deleted: true,
      relatedDeleted: deleted.counts
    },
    next: {
      recommendedResource: planStepsUri(deleted.plan.id),
      reason: "Review the remaining steps after deletion."
    },
    planNextAction: stopAction("The plan content changed after deletion. Show the review URL again before execution.")
  };
}

function assertConfirmation(value: unknown): void {
  if (value !== true) {
    throw invalidRequest("STEP_DELETE_CONFIRMATION_REQUIRED", "Step deletion requires explicit confirmation.", {
      field: "confirmDeleteRelatedData",
      providedValue: value,
      allowedValues: [true]
    });
  }
}

function requireStep(context: ToolCallContext, stepId: string): Step {
  const step = findStepById(context.db, stepId);
  if (!step) {
    throw new ToolError({
      errorType: "not_found",
      code: "STEP_NOT_FOUND",
      message: "Step was not found.",
      reason: "The provided stepId does not resolve to a visible step.",
      retryable: true,
      details: { field: "stepId", providedValue: stepId, stepId },
      resources: {
        deletedStepUri: stepUri(stepId)
      },
      next: {
        recommendedTool: "plan.list",
        reason: "Find the plan and read its steps before retrying."
      }
    });
  }
  return step;
}

function requirePlan(context: ToolCallContext, planId: string): Plan {
  const plan = findPlanById(context.db, planId);
  if (!plan) {
    throw new Error("Step parent plan was not found.");
  }
  return plan;
}

function stopAction(reason: string): NextAction {
  return {
    kind: "stop",
    tool: null,
    resource: null,
    reason,
    requiresUserInput: true,
    shouldContinueRun: false
  };
}
