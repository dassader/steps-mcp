import type { Author, PlanStatus, StepStatus } from "../domain/types.js";
import { updatePlanStatus } from "../repositories/plan.repository.js";
import { createNote } from "../repositories/note.repository.js";
import { findStepById, updateStepStatus } from "../repositories/step.repository.js";
import { createTransition } from "../repositories/transition.repository.js";
import { noteUri, planNextUri, planUri, stepHistoryUri, stepUri } from "../resources/uris.js";
import type { PlanNextStepView } from "../resources/views.js";
import { getNextStepView } from "../services/next-step.service.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function stepStartNextHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const planId = String(args.planId);
  const noteText = readNoteText(args.noteText);
  const author = readAuthor(args.author);

  const started = context.db.transaction(() => {
    const nextStep = getNextStepView(context.db, planId, { publicUrl: context.publicUrl });
    if (!nextStep) {
      throw new ToolError({
        errorType: "not_found",
        code: "PLAN_NOT_FOUND",
        message: "Plan was not found.",
        reason: "The provided planId does not resolve to a visible plan.",
        retryable: true,
        details: { field: "planId", providedValue: planId, planId },
        resources: {
          planUri: planUri(planId),
          nextUri: planNextUri(planId)
        },
        next: {
          recommendedTool: "plan.list",
          reason: "List visible plans or ask the user for a valid plan id."
        }
      });
    }

    if (nextStep.state !== "step_available" || !nextStep.selectedStep) {
      throw startNextStateError(nextStep);
    }

    const step = findStepById(context.db, nextStep.selectedStep.id);
    if (!step || step.status !== "todo") {
      throw startNextStateError({
        ...nextStep,
        state: "no_executable_steps",
        message: "The selected next step is no longer startable.",
        selectedStep: null
      });
    }

    const previousPlanStatus = nextStep.planStatus;
    const previousStatus = step.status;
    if (previousPlanStatus === "approved") {
      updatePlanStatus(context.db, planId, "executing");
    }

    const note = createNote(context.db, step.id, noteText, author);
    const transition = createTransition(context.db, step.id, previousStatus, "implementing", note.id);
    const updatedStep = updateStepStatus(context.db, step.id, "implementing");
    if (!updatedStep) {
      throw new Error("Step disappeared during start_next.");
    }

    return {
      previousPlanStatus,
      previousStatus,
      planStatus: "executing" as PlanStatus,
      step: updatedStep,
      note,
      transition
    };
  })();

  const currentStepUri = stepUri(started.step.id);

  return {
    ok: true,
    message: "Next step was started.",
    changed: {
      notesCreated: 1,
      transitionsCreated: 1,
      stepsUpdated: 1,
      plansUpdated: started.previousPlanStatus === "approved" ? 1 : 0
    },
    resources: {
      planUri: planUri(planId),
      stepUri: currentStepUri,
      noteUri: noteUri(started.note.id),
      historyUri: stepHistoryUri(started.step.id),
      nextUri: planNextUri(planId)
    },
    state: {
      planId,
      previousPlanStatus: started.previousPlanStatus,
      planStatus: started.planStatus,
      stepId: started.step.id,
      previousStatus: started.previousStatus,
      currentStatus: started.step.status,
      status: started.step.status,
      noteId: started.note.id,
      transitionId: started.transition.id
    },
    next: {
      recommendedResource: currentStepUri,
      reason: "Read the started step before performing the work."
    },
    planNextAction: {
      kind: "read_resource",
      tool: null,
      resource: currentStepUri,
      reason: "Read the started step and perform its work before asking for another next step.",
      requiresUserInput: false,
      shouldContinueRun: true
    }
  };
}

function startNextStateError(view: PlanNextStepView): ToolError {
  const baseResources = {
    planUri: planUri(view.planId),
    nextUri: planNextUri(view.planId)
  };
  const recommendedNext = {
    recommendedResource: planNextUri(view.planId),
    reason: "Read the server-selected next state before deciding whether to retry, continue, or stop."
  };

  switch (view.state) {
    case "plan_not_approved":
      return new ToolError({
        errorType: "state_error",
        code: "PLAN_NOT_APPROVED",
        message: "Plan has not been approved yet.",
        reason: "Show links.reviewUrl to the user and wait for explicit approval before starting execution.",
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus,
          links: view.links
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "plan_paused":
      return new ToolError({
        errorType: "state_error",
        code: "PLAN_PAUSED",
        message: "Plan execution is paused.",
        reason: "Resume the plan only after the user asks to continue.",
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "plan_blocked":
      return new ToolError({
        errorType: "state_error",
        code: "PLAN_BLOCKED",
        message: "Plan execution is blocked.",
        reason: view.nextAction.reason,
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "active_step":
      return new ToolError({
        errorType: "conflict",
        code: "PLAN_HAS_ACTIVE_STEP",
        message: "Plan already has an active step.",
        reason: "Continue the active step before starting any unrelated work.",
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus,
          activeStep: view.selectedStep
        },
        resources: {
          ...baseResources,
          stepUri: view.selectedStep ? stepUri(view.selectedStep.id) : null
        },
        next: recommendedNext
      });
    case "ordered_chain_blocked":
      return new ToolError({
        errorType: "state_error",
        code: "PLAN_NEXT_ORDERED_CHAIN_BLOCKED",
        message: "Ordered work is blocked.",
        reason: "No independent steps are available and the ordered chain is blocked.",
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus,
          blockedBy: view.blockedBy
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "all_steps_done":
      return new ToolError({
        errorType: "state_error",
        code: view.planStatus === "completed" ? "PLAN_ALREADY_COMPLETED" : "PLAN_ALL_STEPS_DONE",
        message: view.planStatus === "completed" ? "Plan is already completed." : "All steps in the plan are done.",
        reason: view.nextAction.reason,
        retryable: false,
        details: {
          planId: view.planId,
          planStatus: view.planStatus
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "no_executable_steps":
      return new ToolError({
        errorType: "state_error",
        code: "PLAN_NO_EXECUTABLE_STEPS",
        message: "No executable step is available.",
        reason: view.nextAction.reason,
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus
        },
        resources: baseResources,
        next: recommendedNext
      });
    case "step_available":
      return new ToolError({
        errorType: "conflict",
        code: "PLAN_NEXT_STEP_CHANGED",
        message: "The server-selected step changed before it could be started.",
        reason: "Read the next resource and retry if a step is still available.",
        retryable: true,
        details: {
          planId: view.planId,
          planStatus: view.planStatus
        },
        resources: baseResources,
        next: recommendedNext
      });
  }
}

function readNoteText(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("NOTE_TEXT_REQUIRED", "Start note text is required.", {
      field: "noteText",
      providedValue: value
    });
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
