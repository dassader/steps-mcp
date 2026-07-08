import type { Author, Step } from "../domain/types.js";
import { createNote } from "../repositories/note.repository.js";
import { findStepById } from "../repositories/step.repository.js";
import { noteAttachmentsUri, noteUri, planUri, stepHistoryUri, stepUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function noteCreateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const stepId = String(args.stepId);
  const text = readText(args.text);
  const author = readAuthor(args.author);
  const step = requireStep(context, stepId);
  const note = createNote(context.db, step.id, text, author);

  return {
    ok: true,
    message: "Note was created.",
    changed: {
      notesCreated: 1
    },
    resources: {
      noteUri: noteUri(note.id),
      stepUri: stepUri(step.id),
      planUri: planUri(step.planId),
      historyUri: stepHistoryUri(step.id),
      attachmentsUri: noteAttachmentsUri(note.id)
    },
    state: {
      noteId: note.id,
      planId: step.planId,
      stepId: step.id,
      author: note.author,
      createdAt: note.createdAt
    },
    next: {
      recommendedTool: "attachment.create",
      reason: "Create an attachment if this note needs supporting evidence."
    }
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

function readText(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("NOTE_TEXT_REQUIRED", "Note text is required.", {
      field: "text",
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
