import type { Note, Step } from "../domain/types.js";
import { countAttachmentsByNoteId } from "../repositories/attachment.repository.js";
import { deleteNote, findNoteById, noteHasTransitionReference } from "../repositories/note.repository.js";
import { findStepById } from "../repositories/step.repository.js";
import { noteAttachmentsUri, noteUri, planUri, stepHistoryUri, stepTransitionsUri, stepUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function noteDeleteHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const noteId = String(args.noteId);
  const confirmDeleteAttachments = args.confirmDeleteAttachments === true;

  const deleted = context.db.transaction(() => {
    const note = requireNote(context, noteId);
    const step = requireStep(context, note.stepId);
    if (noteHasTransitionReference(context.db, note.id)) {
      throw new ToolError({
        errorType: "conflict",
        code: "NOTE_DELETE_REQUIRED_BY_TRANSITION",
        message: "Note is required by a transition and cannot be deleted.",
        reason: "Transition notes are part of the step audit history and must remain immutable.",
        retryable: false,
        details: {
          noteId: note.id,
          stepId: step.id
        },
        resources: {
          noteUri: noteUri(note.id),
          stepUri: stepUri(step.id),
          transitionsUri: stepTransitionsUri(step.id)
        },
        next: {
          recommendedResource: stepTransitionsUri(step.id),
          reason: "Read the step transitions to understand why this note is protected."
        }
      });
    }

    const attachmentsDeleted = countAttachmentsByNoteId(context.db, note.id);
    if (attachmentsDeleted > 0 && !confirmDeleteAttachments) {
      throw invalidRequest(
        "NOTE_DELETE_ATTACHMENTS_CONFIRMATION_REQUIRED",
        "Deleting this note also deletes attachments and requires confirmation.",
        {
          field: "confirmDeleteAttachments",
          providedValue: args.confirmDeleteAttachments,
          noteId: note.id,
          attachments: attachmentsDeleted
        },
        {
          recommendedResource: noteAttachmentsUri(note.id),
          reason: "Read note attachments, then retry with confirmDeleteAttachments: true only if deletion is intended."
        }
      );
    }

    const notesDeleted = deleteNote(context.db, note.id);
    if (notesDeleted !== 1) {
      throw new Error("Note disappeared during deletion.");
    }

    return { note, step, attachmentsDeleted };
  })();

  return {
    ok: true,
    message: "Note was deleted.",
    changed: {
      notesDeleted: 1,
      attachmentsDeleted: deleted.attachmentsDeleted
    },
    resources: {
      planUri: planUri(deleted.step.planId),
      stepUri: stepUri(deleted.step.id),
      historyUri: stepHistoryUri(deleted.step.id)
    },
    state: {
      noteId: deleted.note.id,
      planId: deleted.step.planId,
      stepId: deleted.step.id,
      deleted: true
    },
    next: {
      recommendedResource: stepHistoryUri(deleted.step.id),
      reason: "Read the step history if current context is needed."
    }
  };
}

function requireNote(context: ToolCallContext, noteId: string): Note {
  const note = findNoteById(context.db, noteId);
  if (!note) {
    throw new ToolError({
      errorType: "not_found",
      code: "NOTE_NOT_FOUND",
      message: "Note was not found.",
      reason: "The provided noteId does not resolve to a visible note.",
      retryable: true,
      details: { field: "noteId", providedValue: noteId, noteId },
      resources: {
        noteUri: noteUri(noteId)
      },
      next: {
        recommendedTool: "plan.list",
        reason: "Find the plan and read step notes before retrying."
      }
    });
  }
  return note;
}

function requireStep(context: ToolCallContext, stepId: string): Step {
  const step = findStepById(context.db, stepId);
  if (!step) {
    throw new Error("Note parent step was not found.");
  }
  return step;
}
