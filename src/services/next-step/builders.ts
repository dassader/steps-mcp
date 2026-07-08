import type { Plan, Step } from "../../domain/types.js";
import { planNextUri, planUri, stepUri, userFacingLinks } from "../../resources/uris.js";
import type { BlockedByStep, NextAction, PlanNextStepView } from "../../resources/views.js";

export type BaseNextStepView = Omit<
  PlanNextStepView,
  "state" | "message" | "selectedStep" | "blockedBy" | "nextAction"
>;

export function createBaseNextStepView(plan: Plan, publicUrl: string): BaseNextStepView {
  return {
    resourceType: "plan_next_step",
    uri: planNextUri(plan.id),
    planId: plan.id,
    planUri: planUri(plan.id),
    planStatus: plan.status,
    links: userFacingLinks(publicUrl, plan.id)
  };
}

export function withStop(
  base: BaseNextStepView,
  state: PlanNextStepView["state"],
  message: string,
  options: { reason: string; requiresUserInput: boolean }
): PlanNextStepView {
  return {
    ...base,
    state,
    message,
    selectedStep: null,
    blockedBy: null,
    nextAction: stopAction(options.reason, options.requiresUserInput)
  };
}

export function toBlockedByStep(step: Step): BlockedByStep {
  return {
    stepId: step.id,
    stepUri: stepUri(step.id),
    title: step.title,
    order: step.order,
    status: step.status,
    message: "This ordered step must be unblocked before later ordered steps can run."
  };
}

export function callToolAction(tool: string, reason: string): NextAction {
  return {
    kind: "call_tool",
    tool,
    resource: null,
    reason,
    requiresUserInput: false,
    shouldContinueRun: true
  };
}

export function readResourceAction(resource: string, reason: string): NextAction {
  return {
    kind: "read_resource",
    tool: null,
    resource,
    reason,
    requiresUserInput: false,
    shouldContinueRun: true
  };
}

export function stopAction(reason: string, requiresUserInput: boolean): NextAction {
  return {
    kind: "stop",
    tool: null,
    resource: null,
    reason,
    requiresUserInput,
    shouldContinueRun: false
  };
}
