import { findPlanById, getStepCounts, updatePlanStatus } from "../repositories/plan.repository.js";
import { planNextUri, planResourceLinks, planUri, userFacingLinks } from "../resources/uris.js";
import type { NextAction } from "../resources/views.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function planApproveHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const approvalEvidence = readApprovalEvidence(args.approvalEvidence);
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

  if (plan.status !== "draft") {
    throw new ToolError({
      errorType: "state_error",
      code: "PLAN_APPROVAL_NOT_ALLOWED",
      message: "Plan approval is only allowed for draft plans.",
      reason: "Only a draft plan can be approved for execution.",
      retryable: true,
      details: {
        planId,
        currentStatus: plan.status,
        requiredStatus: "draft"
      },
      resources: {
        planUri: planUri(planId)
      },
      next: {
        recommendedResource: planUri(planId),
        reason: "Read the current plan state before deciding the next action."
      }
    });
  }

  const stepCounts = getStepCounts(context.db, planId);
  if (stepCounts.total === 0) {
    throw new ToolError({
      errorType: "state_error",
      code: "PLAN_APPROVAL_REQUIRES_STEPS",
      message: "Plan approval requires at least one step.",
      reason: "An empty plan cannot enter the execution workflow.",
      retryable: true,
      details: {
        planId,
        stepCounts
      },
      resources: {
        planUri: planUri(planId),
        stepsUri: planResourceLinks(planId).stepsUri
      },
      next: {
        recommendedTool: "step.create",
        reason: "Create at least one step, then show links.reviewUrl and wait for approval again."
      }
    });
  }

  const updated = updatePlanStatus(context.db, planId, "approved");
  if (!updated) {
    throw new Error("Plan disappeared during approval.");
  }

  return {
    ok: true,
    message: "Plan was approved for execution.",
    changed: {
      plansUpdated: 1
    },
    resources: planResourceLinks(planId),
    links: userFacingLinks(context.publicUrl, planId),
    state: {
      planId,
      previousPlanStatus: plan.status,
      planStatus: updated.status,
      approvalEvidence
    },
    next: {
      recommendedResource: planNextUri(planId),
      reason: "Read the server-selected next step and begin the approved run loop."
    },
    planNextAction: readNextAction(planId)
  };
}

function readApprovalEvidence(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("PLAN_APPROVAL_EVIDENCE_REQUIRED", "Plan approval evidence is required.", {
      field: "approvalEvidence",
      providedValue: value
    });
  }
  return value.trim();
}

function readNextAction(planId: string): NextAction {
  return {
    kind: "read_resource",
    tool: null,
    resource: planNextUri(planId),
    reason: "Plan is approved. Read the server-selected next step and start the run loop.",
    requiresUserInput: false,
    shouldContinueRun: true
  };
}
