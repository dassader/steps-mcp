import type { Attachment, Note, Step } from "../domain/types.js";
import { deleteAttachment, findAttachmentById } from "../repositories/attachment.repository.js";
import { findNoteById } from "../repositories/note.repository.js";
import { findStepById } from "../repositories/step.repository.js";
import { attachmentUri, noteAttachmentsUri, noteUri, planUri, stepUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function attachmentDeleteHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const attachmentId = String(args.attachmentId);
  assertConfirmation(args.confirmDeleteContent);

  const deleted = context.db.transaction(() => {
    const attachment = requireAttachment(context, attachmentId);
    const note = requireNote(context, attachment.noteId);
    const step = requireStep(context, note.stepId);
    const attachmentsDeleted = deleteAttachment(context.db, attachment.id);
    if (attachmentsDeleted !== 1) {
      throw new Error("Attachment disappeared during deletion.");
    }
    return { attachment, note, step };
  })();

  return {
    ok: true,
    message: "Attachment and stored content were deleted.",
    changed: {
      attachmentsDeleted: 1,
      contentDeleted: deleted.attachment.contentKind !== "none"
    },
    resources: {
      deletedAttachmentUri: attachmentUri(deleted.attachment.id),
      noteUri: noteUri(deleted.note.id),
      stepUri: stepUri(deleted.step.id),
      planUri: planUri(deleted.step.planId),
      noteAttachmentsUri: noteAttachmentsUri(deleted.note.id)
    },
    state: {
      attachmentId: deleted.attachment.id,
      planId: deleted.step.planId,
      stepId: deleted.step.id,
      noteId: deleted.note.id,
      deleted: true
    },
    next: {
      recommendedResource: noteAttachmentsUri(deleted.note.id),
      reason: "Read remaining note attachments if needed."
    }
  };
}

function assertConfirmation(value: unknown): void {
  if (value !== true) {
    throw invalidRequest("ATTACHMENT_DELETE_CONFIRMATION_REQUIRED", "Attachment deletion requires explicit confirmation.", {
      field: "confirmDeleteContent",
      providedValue: value,
      allowedValues: [true]
    });
  }
}

function requireAttachment(context: ToolCallContext, attachmentId: string): Attachment {
  const attachment = findAttachmentById(context.db, attachmentId);
  if (!attachment) {
    throw new ToolError({
      errorType: "not_found",
      code: "ATTACHMENT_NOT_FOUND",
      message: "Attachment was not found.",
      reason: "The provided attachmentId does not resolve to a visible attachment.",
      retryable: true,
      details: { field: "attachmentId", providedValue: attachmentId, attachmentId },
      resources: {
        attachmentUri: attachmentUri(attachmentId)
      },
      next: {
        recommendedTool: "plan.list",
        reason: "Find the plan, step, or note and read its attachments before retrying."
      }
    });
  }
  return attachment;
}

function requireNote(context: ToolCallContext, noteId: string): Note {
  const note = findNoteById(context.db, noteId);
  if (!note) {
    throw new Error("Attachment parent note was not found.");
  }
  return note;
}

function requireStep(context: ToolCallContext, stepId: string): Step {
  const step = findStepById(context.db, stepId);
  if (!step) {
    throw new Error("Attachment parent step was not found.");
  }
  return step;
}
