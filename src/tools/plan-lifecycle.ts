import type { Plan, PlanStatus } from "../domain/types.js";
import { findPlanById, updatePlanStatus } from "../repositories/plan.repository.js";
import { planNextUri, planSummaryUri, planTimelineUri, planUri } from "../resources/uris.js";
import type { NextAction } from "../resources/views.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function planPauseHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const reason = readReason(args.reason, "PLAN_PAUSE_REASON_REQUIRED");
  const plan = requirePlan(context, planId);
  ensurePlanStatus(plan, ["executing"], "PLAN_PAUSE_NOT_ALLOWED", "Plan can only be paused while executing.");
  const updated = updatePlanStatusOrThrow(context, planId, "paused");

  return lifecycleSuccess({
    message: "Plan execution was paused.",
    planId,
    previousStatus: plan.status,
    status: updated.status,
    state: { reason },
    next: {
      none: true,
      reason: "The run loop is paused. Do not continue until the user asks to resume."
    },
    planNextAction: stopAction("Plan execution is paused. Wait until the user asks to resume.")
  });
}

export function planResumeHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const plan = requirePlan(context, planId);
  ensurePlanStatus(plan, ["paused"], "PLAN_RESUME_NOT_ALLOWED", "Plan can only be resumed from paused status.");
  const updated = updatePlanStatusOrThrow(context, planId, "executing", null);

  return lifecycleSuccess({
    message: "Plan execution was resumed.",
    planId,
    previousStatus: plan.status,
    status: updated.status,
    next: {
      recommendedResource: planNextUri(planId),
      reason: "Read the server-selected next step and continue the run loop."
    },
    planNextAction: readNextAction(planId, "Plan execution resumed. Read the next server recommendation and continue the run loop.")
  });
}

export function planBlockHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const reason = readReason(args.reason, "PLAN_BLOCK_REASON_REQUIRED");
  const plan = requirePlan(context, planId);
  ensurePlanStatus(plan, ["approved", "executing"], "PLAN_BLOCK_NOT_ALLOWED", "Plan can only be blocked while approved or executing.");
  const updated = updatePlanStatusOrThrow(context, planId, "blocked", reason);

  return lifecycleSuccess({
    message: "Plan was blocked.",
    planId,
    previousStatus: plan.status,
    status: updated.status,
    state: { reason },
    next: {
      none: true,
      reason: "The plan has a plan-level blocker. Explain it to the user and wait."
    },
    planNextAction: stopAction("The plan has a plan-level blocker. Explain the blocker to the user and wait.")
  });
}

export function planUnblockHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const plan = requirePlan(context, planId);
  ensurePlanStatus(plan, ["blocked"], "PLAN_UNBLOCK_NOT_ALLOWED", "Plan can only be unblocked from blocked status.");
  const updated = updatePlanStatusOrThrow(context, planId, "executing", null);

  return lifecycleSuccess({
    message: "Plan-level blocker was cleared.",
    planId,
    previousStatus: plan.status,
    status: updated.status,
    next: {
      recommendedResource: planNextUri(planId),
      reason: "Read the server-selected next step and continue if no user input is required."
    },
    planNextAction: readNextAction(planId, "Plan-level blocker was cleared. Read the next server recommendation and continue if it is executable.")
  });
}

function lifecycleSuccess(input: {
  message: string;
  planId: string;
  previousStatus: PlanStatus;
  status: PlanStatus;
  state?: Record<string, unknown>;
  next: ToolSuccess["next"];
  planNextAction: NextAction;
}): ToolSuccess {
  return {
    ok: true,
    message: input.message,
    changed: {
      plansUpdated: 1
    },
    resources: lifecycleResources(input.planId),
    state: {
      planId: input.planId,
      previousPlanStatus: input.previousStatus,
      planStatus: input.status,
      ...input.state
    },
    next: input.next,
    planNextAction: input.planNextAction
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

function ensurePlanStatus(plan: Plan, allowedStatuses: PlanStatus[], code: string, message: string): void {
  if (allowedStatuses.includes(plan.status)) return;
  throw new ToolError({
    errorType: "state_error",
    code,
    message,
    reason: message,
    retryable: true,
    details: {
      planId: plan.id,
      currentStatus: plan.status,
      allowedStatuses
    },
    resources: {
      planUri: planUri(plan.id),
      nextUri: planNextUri(plan.id)
    },
    next: {
      recommendedResource: planUri(plan.id),
      reason: "Read the current plan state before deciding the next action."
    }
  });
}

function updatePlanStatusOrThrow(
  context: ToolCallContext,
  planId: string,
  status: PlanStatus,
  blockerReason?: string | null
): Plan {
  const updated = updatePlanStatus(context.db, planId, status, blockerReason);
  if (!updated) throw new Error("Plan disappeared during lifecycle update.");
  return updated;
}

function readReason(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest(code, "A non-empty reason is required.", {
      field: "reason",
      providedValue: value
    });
  }
  return value.trim();
}

function lifecycleResources(planId: string) {
  return {
    planUri: planUri(planId),
    nextUri: planNextUri(planId),
    summaryUri: planSummaryUri(planId),
    timelineUri: planTimelineUri(planId)
  };
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

function readNextAction(planId: string, reason: string): NextAction {
  return {
    kind: "read_resource",
    tool: null,
    resource: planNextUri(planId),
    reason,
    requiresUserInput: false,
    shouldContinueRun: true
  };
}
