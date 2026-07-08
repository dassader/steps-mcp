import { findPlanById, updatePlan } from "../repositories/plan.repository.js";
import { planResourceLinks, planUri, userFacingLinks } from "../resources/uris.js";
import { getNextStepView } from "../services/next-step.service.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function planUpdateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const title = readTitle(args);
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

  const planStatus = plan.status === "approved" ? "draft" : plan.status;
  const updated = updatePlan(context.db, planId, { title, status: planStatus });
  if (!updated) {
    throw new Error("Plan disappeared during update.");
  }
  const nextStep = getNextStepView(context.db, planId, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Plan was updated.",
    changed: {
      plansUpdated: 1
    },
    resources: planResourceLinks(planId),
    links: userFacingLinks(context.publicUrl, planId),
    state: {
      planId,
      previousPlanStatus: plan.status,
      planStatus: updated.status,
      title: updated.title,
      updatedAt: updated.updatedAt
    },
    next: {
      recommendedResource: planUri(planId),
      reason: "Read the updated plan and show links.reviewUrl again if approval is needed."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
}

function readTitle(args: Record<string, unknown>): string {
  if (!("title" in args)) {
    throw invalidRequest("PLAN_UPDATE_EMPTY_PATCH", "Plan update requires at least one editable field.", {
      field: "title"
    });
  }
  if (typeof args.title !== "string" || args.title.trim() === "") {
    throw invalidRequest("PLAN_TITLE_REQUIRED", "Plan title is required.", {
      field: "title",
      providedValue: args.title
    });
  }
  return args.title.trim();
}
