import type { SqliteDatabase } from "../db/connection.js";
import type { Plan } from "../domain/types.js";
import {
  findActiveStepByPlanId,
  findBlockedOrderedStep,
  findNextTodoStep
} from "../repositories/step.repository.js";
import { findPlanById, getStepCounts } from "../repositories/plan.repository.js";
import { stepUri } from "../resources/uris.js";
import type { PlanNextStepView } from "../resources/views.js";
import {
  callToolAction,
  createBaseNextStepView,
  readResourceAction,
  stopAction,
  toBlockedByStep,
  withStop
} from "./next-step/builders.js";
import { toStepSummary } from "./shared/step-summary.js";

export interface NextStepOptions {
  publicUrl?: string;
}

const defaultPublicUrl = "http://127.0.0.1:3001";

export function getNextStepView(
  db: SqliteDatabase,
  planId: string,
  options: NextStepOptions = {}
): PlanNextStepView | null {
  const plan = findPlanById(db, planId);
  if (!plan) return null;

  return buildNextStepView(db, plan, options.publicUrl ?? defaultPublicUrl);
}

function buildNextStepView(db: SqliteDatabase, plan: Plan, publicUrl: string): PlanNextStepView {
  const base = createBaseNextStepView(plan, publicUrl);

  if (plan.status === "draft") {
    return withStop(base, "plan_not_approved", "Plan has not been approved yet.", {
      reason: "Show links.reviewUrl to the user and wait for explicit approval before starting execution.",
      requiresUserInput: true
    });
  }

  if (plan.status === "paused") {
    return withStop(base, "plan_paused", "Plan execution is paused.", {
      reason: "Plan execution is paused. Resume only after the user asks to continue.",
      requiresUserInput: true
    });
  }

  if (plan.status === "blocked") {
    return withStop(base, "plan_blocked", "Plan execution is blocked.", {
      reason: plan.blockerReason ?? "Plan-level execution is blocked. Explain the blocker and wait for user or external action.",
      requiresUserInput: true
    });
  }

  if (plan.status === "completed") {
    return withStop(base, "all_steps_done", "All steps in the plan are done.", {
      reason: "All steps in the plan are done.",
      requiresUserInput: false
    });
  }

  const activeStep = findActiveStepByPlanId(db, plan.id);
  if (activeStep) {
    return {
      ...base,
      state: "active_step",
      message: "A step is already active.",
      selectedStep: toStepSummary(activeStep),
      blockedBy: null,
      nextAction: readResourceAction(
        stepUri(activeStep.id),
        "Continue the active step before starting any unrelated work."
      )
    };
  }

  const counts = getStepCounts(db, plan.id);
  if (counts.total > 0 && counts.done === counts.total) {
    return withStop(base, "all_steps_done", "All steps in the plan are done.", {
      reason: "All steps in the plan are done.",
      requiresUserInput: false
    });
  }

  const selectedStep = findNextTodoStep(db, plan.id);
  if (selectedStep) {
    return {
      ...base,
      state: "step_available",
      message: "A todo step is available.",
      selectedStep: toStepSummary(selectedStep),
      blockedBy: null,
      nextAction: callToolAction(
        "step.start_next",
        "Start the server-selected step. The plan run has been approved, so no per-step user confirmation is needed."
      )
    };
  }

  const blockedOrderedStep = findBlockedOrderedStep(db, plan.id);
  if (blockedOrderedStep) {
    return {
      ...base,
      state: "ordered_chain_blocked",
      message: "No independent steps are available. The ordered chain is blocked.",
      selectedStep: null,
      blockedBy: toBlockedByStep(blockedOrderedStep),
      nextAction: stopAction(
        "The ordered chain is blocked and no independent executable step remains.",
        true
      )
    };
  }

  return withStop(base, "no_executable_steps", "Work remains, but no step can be executed now.", {
    reason: "No executable step is available. The agent should explain the server state to the user.",
    requiresUserInput: true
  });
}
