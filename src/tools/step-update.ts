import { findPlanById, updatePlanStatus } from "../repositories/plan.repository.js";
import { findStepById, updateStep, type StepUpdate } from "../repositories/step.repository.js";
import { planNextUri, planUri, stepUri } from "../resources/uris.js";
import { getNextStepView } from "../services/next-step.service.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function stepUpdateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  if ("status" in args) {
    throw invalidRequest("STEP_STATUS_UPDATE_NOT_ALLOWED", "Step status changes must use step.transition.", {
      field: "status",
      providedValue: args.status
    });
  }

  const stepId = String(args.stepId);
  const patch = readPatch(args);
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
        stepUri: stepUri(stepId)
      },
      next: {
        recommendedTool: "plan.list",
        reason: "Find the plan and read its steps before retrying."
      }
    });
  }

  const plan = findPlanById(context.db, step.planId);
  if (!plan) {
    throw new Error("Step parent plan was not found.");
  }

  const updated = context.db.transaction(() => {
    const nextPlanStatus = plan.status === "approved" ? "draft" : plan.status;
    const updatedStep = updateStep(context.db, step.id, patch);
    updatePlanStatus(context.db, plan.id, nextPlanStatus);
    return { step: updatedStep, planStatus: nextPlanStatus };
  })();

  if (!updated.step) {
    throw new Error("Step disappeared during update.");
  }

  const nextStep = getNextStepView(context.db, plan.id, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Step was updated.",
    changed: {
      stepsUpdated: 1,
      plansUpdated: 1
    },
    resources: {
      stepUri: stepUri(step.id),
      planUri: planUri(plan.id),
      nextUri: planNextUri(plan.id)
    },
    state: {
      stepId: step.id,
      planId: plan.id,
      planStatus: updated.planStatus,
      status: updated.step.status,
      order: updated.step.order,
      updatedAt: updated.step.updatedAt
    },
    next: {
      recommendedResource: stepUri(step.id),
      reason: "Read the updated step if current editable fields are needed."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
}

function readPatch(args: Record<string, unknown>): StepUpdate {
  const patch: StepUpdate = {};
  if ("title" in args) {
    patch.title = readText(args.title, "title", "STEP_TITLE_REQUIRED", "Step title is required.");
  }
  if ("description" in args) {
    patch.description = readText(args.description, "description", "STEP_DESCRIPTION_REQUIRED", "Step description is required.");
  }
  if ("order" in args) {
    patch.order = readOrder(args.order);
  }
  if (Object.keys(patch).length === 0) {
    throw invalidRequest("STEP_UPDATE_EMPTY_PATCH", "Step update requires at least one editable field.", {
      fields: ["title", "description", "order"]
    });
  }
  return patch;
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
