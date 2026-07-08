import type { Author, Plan, PlanStatus, Step, StepStatus } from "../domain/types.js";
import { findPlanById, getStepCounts, updatePlanStatus } from "../repositories/plan.repository.js";
import { createNote } from "../repositories/note.repository.js";
import { findStepById, updateStepStatus } from "../repositories/step.repository.js";
import { createTransition } from "../repositories/transition.repository.js";
import { noteUri, planNextUri, planUri, stepHistoryUri, stepUri } from "../resources/uris.js";
import { getNextStepView } from "../services/next-step.service.js";
import { getAllowedTransitions, isTransitionAllowed } from "../utils/step-status.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

const statusDocUri = "steps://docs/flows/status";
const stepStatuses: StepStatus[] = ["todo", "implementing", "verification", "blocked", "done"];

export function stepTransitionHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const stepId = String(args.stepId);
  const fromStatus = readStepStatus(args.fromStatus, "fromStatus");
  const toStatus = readStepStatus(args.toStatus, "toStatus");
  const noteText = readNoteText(args.noteText);
  const author = readAuthor(args.author);

  const changed = context.db.transaction(() => {
    const step = requireStep(context, stepId);
    const plan = requirePlan(context, step.planId);

    ensureFromStatusMatches(step, fromStatus, toStatus);
    ensureTransitionAllowed(step, toStatus);
    ensurePlanAllowsTransitionIntoImplementation(plan, toStatus);

    const previousStatus = step.status;
    const note = createNote(context.db, step.id, noteText, author);
    const transition = createTransition(context.db, step.id, previousStatus, toStatus, note.id);
    const updatedStep = updateStepStatus(context.db, step.id, toStatus);
    if (!updatedStep) {
      throw new Error("Step disappeared during transition.");
    }

    const nextPlanStatus = resolveNextPlanStatus(context, plan);
    const updatedPlan = nextPlanStatus === plan.status ? plan : updatePlanStatus(context.db, plan.id, nextPlanStatus, null);
    if (!updatedPlan) {
      throw new Error("Plan disappeared during transition.");
    }

    return {
      plan: updatedPlan,
      previousPlanStatus: plan.status,
      previousStatus,
      step: updatedStep,
      note,
      transition,
      plansUpdated: nextPlanStatus === plan.status ? 0 : 1
    };
  })();

  const nextStep = getNextStepView(context.db, changed.plan.id, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Step status was changed through a note-backed transition.",
    changed: {
      notesCreated: 1,
      transitionsCreated: 1,
      stepsUpdated: 1,
      plansUpdated: changed.plansUpdated
    },
    resources: {
      planUri: planUri(changed.plan.id),
      stepUri: stepUri(changed.step.id),
      noteUri: noteUri(changed.note.id),
      historyUri: stepHistoryUri(changed.step.id),
      nextUri: planNextUri(changed.plan.id)
    },
    state: {
      planId: changed.plan.id,
      previousPlanStatus: changed.previousPlanStatus,
      planStatus: changed.plan.status,
      stepId: changed.step.id,
      previousStatus: changed.previousStatus,
      currentStatus: changed.step.status,
      status: changed.step.status,
      noteId: changed.note.id,
      transitionId: changed.transition.id
    },
    next: {
      recommendedResource: planNextUri(changed.plan.id),
      reason: "If plan execution is approved, read the next server recommendation and continue the run loop until a stop state is returned."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
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
        stepUri: stepUri(stepId)
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

function ensureFromStatusMatches(step: Step, fromStatus: StepStatus, toStatus: StepStatus): void {
  if (step.status === fromStatus) return;
  throw transitionStateError({
    code: "STEP_TRANSITION_FROM_STATUS_MISMATCH",
    message: "Step status does not match the requested fromStatus.",
    reason: "The step status changed or the caller used a stale fromStatus.",
    step,
    fromStatus,
    toStatus,
    recommendedResource: stepUri(step.id)
  });
}

function ensureTransitionAllowed(step: Step, toStatus: StepStatus): void {
  if (isTransitionAllowed(step.status, toStatus)) return;
  throw transitionStateError({
    code: "STEP_TRANSITION_NOT_ALLOWED",
    message: "The requested transition is not allowed from the current step status.",
    reason: "Retry with one of details.allowedTransitions, or read the current step if more context is needed.",
    step,
    fromStatus: step.status,
    toStatus,
    recommendedResource: statusDocUri
  });
}

function ensurePlanAllowsTransitionIntoImplementation(plan: Plan, toStatus: StepStatus): void {
  if (toStatus !== "implementing") return;

  if (plan.status === "paused") {
    throw planStateError("PLAN_PAUSED", "Plan execution is paused.", "Resume the plan only after the user asks to continue.", plan);
  }
  if (plan.status === "blocked") {
    throw planStateError("PLAN_BLOCKED", "Plan execution is blocked.", "Clear the plan-level blocker before continuing implementation.", plan);
  }
  if (plan.status === "draft") {
    throw planStateError("PLAN_NOT_APPROVED", "Plan has not been approved yet.", "Show the review URL and wait for approval before continuing implementation.", plan);
  }
}

function resolveNextPlanStatus(context: ToolCallContext, plan: Plan): PlanStatus {
  const counts = getStepCounts(context.db, plan.id);
  if (counts.total > 0 && counts.done === counts.total) {
    return "completed";
  }
  if (plan.status === "completed" || plan.status === "approved") {
    return "executing";
  }
  return plan.status;
}

function transitionStateError(input: {
  code: string;
  message: string;
  reason: string;
  step: Step;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  recommendedResource: string;
}): ToolError {
  return new ToolError({
    errorType: "state_error",
    code: input.code,
    message: input.message,
    reason: input.reason,
    retryable: true,
    details: {
      stepId: input.step.id,
      currentStatus: input.step.status,
      requestedTransition: {
        from: input.fromStatus,
        to: input.toStatus
      },
      allowedTransitions: getAllowedTransitions(input.step.status)
    },
    resources: {
      stepUri: stepUri(input.step.id),
      statusDocUri
    },
    next: {
      recommendedResource: input.recommendedResource,
      reason: "Retry with one of details.allowedTransitions, or read the current step if more context is needed."
    }
  });
}

function planStateError(code: string, message: string, reason: string, plan: Plan): ToolError {
  return new ToolError({
    errorType: "state_error",
    code,
    message,
    reason,
    retryable: true,
    details: {
      planId: plan.id,
      planStatus: plan.status
    },
    resources: {
      planUri: planUri(plan.id),
      nextUri: planNextUri(plan.id)
    },
    next: {
      recommendedResource: planNextUri(plan.id),
      reason: "Read the plan next resource before deciding whether to retry or stop."
    }
  });
}

function readStepStatus(value: unknown, field: string): StepStatus {
  if (typeof value !== "string" || !stepStatuses.includes(value as StepStatus)) {
    throw invalidRequest("STEP_TRANSITION_NOT_ALLOWED", "Step transition status is invalid.", {
      field,
      providedValue: value,
      allowedValues: stepStatuses
    });
  }
  return value as StepStatus;
}

function readNoteText(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest(
      "STEP_TRANSITION_NOTE_REQUIRED",
      "Transition note text is required.",
      {
        field: "noteText",
        providedValue: value
      },
      {
        recommendedUserAction: "Prepare a short markdown note explaining why the status is changing.",
        reason: "Retry step.transition with non-empty noteText."
      }
    );
  }
  return value.trim();
}

function readAuthor(value: unknown): Author {
  if (value !== "human" && value !== "agent") {
    throw invalidRequest("NOTE_AUTHOR_INVALID", "Author must be human or agent.", {
      field: "author",
      providedValue: value,
      allowedValues: ["human", "agent"]
    });
  }
  return value;
}
