import { findPlanById, updatePlanStatus } from "../repositories/plan.repository.js";
import { createStep } from "../repositories/step.repository.js";
import { planNextUri, planUri, planStepsUri, stepUri } from "../resources/uris.js";
import { getNextStepView } from "../services/next-step.service.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function stepCreateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const title = readText(args.title, "title", "STEP_TITLE_REQUIRED", "Step title is required.");
  const description = readText(args.description, "description", "STEP_DESCRIPTION_REQUIRED", "Step description is required.");
  const order = readOrder(args.order);
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

  const created = context.db.transaction(() => {
    const step = createStep(context.db, plan.id, title, description, order);
    updatePlanStatus(context.db, plan.id, plan.status === "approved" ? "draft" : plan.status);
    return step;
  })();
  const updatedPlanStatus = plan.status === "approved" ? "draft" : plan.status;
  const nextStep = getNextStepView(context.db, plan.id, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Step was created with status todo.",
    changed: {
      stepsCreated: 1,
      plansUpdated: 1
    },
    resources: {
      planUri: planUri(plan.id),
      stepUri: stepUri(created.id),
      stepsUri: planStepsUri(plan.id),
      nextUri: planNextUri(plan.id)
    },
    state: {
      stepId: created.id,
      planId: plan.id,
      planStatus: updatedPlanStatus,
      status: created.status,
      order: created.order
    },
    next: {
      recommendedResource: planNextUri(plan.id),
      reason: "Read the server-selected next step when the plan is ready for execution."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
}

function readText(value: unknown, field: string, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest(code, message, {
      field,
      providedValue: value
    });
  }
  return value.trim();
}

function readOrder(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw invalidRequest("STEP_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", {
      field: "order",
      providedValue: value
    });
  }
  return value as number;
}
