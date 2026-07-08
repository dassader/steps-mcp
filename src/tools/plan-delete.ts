import { deletePlan, findPlanById, getPlanContainedCounts, type PlanContainedCounts } from "../repositories/plan.repository.js";
import { planUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function planDeleteHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  assertConfirmation(args.confirmDeleteContainedData);
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

  const deleted = deletePlanWithCounts(context, planId);

  return {
    ok: true,
    message: "Plan and contained workflow data were deleted.",
    changed: {
      plansDeleted: 1,
      stepsDeleted: deleted.counts.steps,
      notesDeleted: deleted.counts.notes,
      transitionsDeleted: deleted.counts.transitions,
      attachmentsDeleted: deleted.counts.attachments
    },
    resources: {
      deletedPlanUri: planUri(planId)
    },
    state: {
      planId,
      deleted: true
    },
    next: {
      none: true,
      reason: "The plan no longer exists."
    }
  };
}

function assertConfirmation(value: unknown): void {
  if (value !== true) {
    throw invalidRequest("PLAN_DELETE_CONFIRMATION_REQUIRED", "Plan deletion requires explicit confirmation.", {
      field: "confirmDeleteContainedData",
      providedValue: value,
      allowedValues: [true]
    });
  }
}

function deletePlanWithCounts(context: ToolCallContext, planId: string): { counts: PlanContainedCounts } {
  const remove = context.db.transaction(() => {
    const counts = getPlanContainedCounts(context.db, planId);
    const deletedPlans = deletePlan(context.db, planId);
    if (deletedPlans !== 1) {
      throw new Error("Plan disappeared during deletion.");
    }
    return { counts };
  });

  return remove();
}
