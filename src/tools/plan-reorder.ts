import type { Plan, Step } from "../domain/types.js";
import { findPlanById, updatePlanStatus } from "../repositories/plan.repository.js";
import { findStepsByPlanId, updateStep } from "../repositories/step.repository.js";
import { planNextUri, planStepsUri, planSummaryUri, planUri, userFacingLinks } from "../resources/uris.js";
import type { NextAction } from "../resources/views.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

interface StepOrderInput {
  stepId: string;
  order: number;
}

export function planReorderStepsHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const requestedOrders = readStepOrders(args.stepOrders);
  const plan = requirePlan(context, planId);
  ensureEditablePlan(plan);
  const currentSteps = findStepsByPlanId(context.db, planId);
  validateCompleteStepSet(planId, currentSteps, requestedOrders);
  validatePositiveOrderUniqueness(requestedOrders);

  const nextStatus = plan.status === "approved" ? "draft" : plan.status;
  const updateAll = context.db.transaction(() => {
    for (const stepOrder of requestedOrders) {
      updateStep(context.db, stepOrder.stepId, { order: stepOrder.order });
    }
    updatePlanStatus(context.db, planId, nextStatus);
  });
  updateAll();

  return {
    ok: true,
    message: "Step order was updated.",
    changed: {
      stepsUpdated: requestedOrders.length,
      plansUpdated: 1
    },
    resources: {
      planUri: planUri(planId),
      stepsUri: planStepsUri(planId),
      nextUri: planNextUri(planId),
      summaryUri: planSummaryUri(planId)
    },
    links: userFacingLinks(context.publicUrl, planId),
    state: {
      planId,
      previousPlanStatus: plan.status,
      planStatus: nextStatus,
      orderedStepIds: orderedStepIds(requestedOrders),
      independentStepIds: independentStepIds(requestedOrders)
    },
    next: {
      recommendedResource: planStepsUri(planId),
      reason: "Review the updated step order, then show links.reviewUrl to the user for approval."
    },
    planNextAction: stopAction()
  };
}

function requirePlan(context: ToolCallContext, planId: string): Plan {
  const plan = findPlanById(context.db, planId);
  if (!plan) {
    throw new ToolError({
      errorType: "not_found",
      code: "PLAN_NOT_FOUND",
      message: "Plan was not found.",
      reason: "The provided planId does not resolve to a visible plan.",
      retryable: true,
      details: { field: "planId", providedValue: planId, planId },
      resources: {
        planUri: planUri(planId)
      },
      next: {
        recommendedTool: "plan.list",
        reason: "List visible plans or ask the user for a valid plan id."
      }
    });
  }
  return plan;
}

function ensureEditablePlan(plan: Plan): void {
  if (plan.status === "draft" || plan.status === "approved") return;
  throw new ToolError({
    errorType: "state_error",
    code: "PLAN_REORDER_NOT_ALLOWED",
    message: "Plan steps can only be reordered while the plan is draft or approved.",
    reason: "Reordering active, paused, blocked, or completed plans is not allowed in this version.",
    retryable: false,
    details: {
      planId: plan.id,
      currentStatus: plan.status,
      allowedStatuses: ["draft", "approved"]
    },
    resources: {
      planUri: planUri(plan.id),
      stepsUri: planStepsUri(plan.id)
    },
    next: {
      recommendedResource: planUri(plan.id),
      reason: "Read the plan and stop execution before changing step order."
    }
  });
}

function readStepOrders(value: unknown): StepOrderInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest("PLAN_REORDER_STEPS_REQUIRED", "Step order entries are required.", {
      field: "stepOrders",
      providedValue: value
    });
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw invalidRequest("PLAN_REORDER_STEPS_REQUIRED", "Each step order entry must be an object.", {
        field: `stepOrders.${index}`,
        providedValue: item
      });
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.stepId !== "string" || entry.stepId.trim() === "") {
      throw invalidRequest("PLAN_REORDER_STEP_NOT_IN_PLAN", "Step order entry must include a stepId.", {
        field: `stepOrders.${index}.stepId`,
        providedValue: entry.stepId
      });
    }
    if (!Number.isInteger(entry.order) || (entry.order as number) < 0) {
      throw invalidRequest("PLAN_REORDER_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", {
        field: `stepOrders.${index}.order`,
        providedValue: entry.order
      });
    }
    return {
      stepId: entry.stepId.trim(),
      order: entry.order as number
    };
  });
}

function validateCompleteStepSet(planId: string, currentSteps: Step[], requestedOrders: StepOrderInput[]): void {
  const currentIds = new Set(currentSteps.map((step) => step.id));
  const requestedIds = new Set<string>();

  for (const stepOrder of requestedOrders) {
    if (requestedIds.has(stepOrder.stepId)) {
      throw invalidRequest("PLAN_REORDER_STEP_DUPLICATE", "Step order list contains a duplicate stepId.", {
        planId,
        stepId: stepOrder.stepId
      });
    }
    requestedIds.add(stepOrder.stepId);
    if (!currentIds.has(stepOrder.stepId)) {
      throw invalidRequest("PLAN_REORDER_STEP_NOT_IN_PLAN", "Step does not belong to the plan.", {
        planId,
        stepId: stepOrder.stepId
      });
    }
  }

  if (requestedIds.size !== currentIds.size || currentSteps.some((step) => !requestedIds.has(step.id))) {
    throw invalidRequest("PLAN_REORDER_INCOMPLETE_SET", "Step order list must include every step in the plan exactly once.", {
      planId,
      expectedStepIds: [...currentIds],
      providedStepIds: [...requestedIds]
    });
  }
}

function validatePositiveOrderUniqueness(requestedOrders: StepOrderInput[]): void {
  const seen = new Map<number, string>();
  for (const stepOrder of requestedOrders) {
    if (stepOrder.order === 0) continue;
    const existingStepId = seen.get(stepOrder.order);
    if (existingStepId) {
      throw invalidRequest("PLAN_REORDER_POSITIVE_ORDER_DUPLICATE", "Positive step order values must be unique.", {
        order: stepOrder.order,
        stepIds: [existingStepId, stepOrder.stepId]
      });
    }
    seen.set(stepOrder.order, stepOrder.stepId);
  }
}

function orderedStepIds(requestedOrders: StepOrderInput[]): string[] {
  return requestedOrders
    .filter((stepOrder) => stepOrder.order > 0)
    .sort((left, right) => left.order - right.order || left.stepId.localeCompare(right.stepId))
    .map((stepOrder) => stepOrder.stepId);
}

function independentStepIds(requestedOrders: StepOrderInput[]): string[] {
  return requestedOrders
    .filter((stepOrder) => stepOrder.order === 0)
    .map((stepOrder) => stepOrder.stepId);
}

function stopAction(): NextAction {
  return {
    kind: "stop",
    tool: null,
    resource: null,
    reason: "The plan order changed. Show links.reviewUrl to the user and wait for approval before execution.",
    requiresUserInput: true,
    shouldContinueRun: false
  };
}
