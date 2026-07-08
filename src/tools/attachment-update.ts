import type { Attachment, Note, Step } from "../domain/types.js";
import { findAttachmentById, updateAttachment, type AttachmentUpdate } from "../repositories/attachment.repository.js";
import { findNoteById } from "../repositories/note.repository.js";
import { findStepById } from "../repositories/step.repository.js";
import { hasReadableContent } from "../resources/attachment-views.js";
import { attachmentContentUri, attachmentUri, noteUri, planUri, stepUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function attachmentUpdateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const attachmentId = String(args.attachmentId);
  const patch = readPatch(args);
  const current = requireAttachment(context, attachmentId);
  const note = requireNote(context, current.noteId);
  const step = requireStep(context, note.stepId);
  const updated = updateAttachment(context.db, current.id, patch);
  if (!updated) {
    throw new Error("Attachment disappeared during update.");
  }

  return buildAttachmentUpdatedSuccess(updated, note, step);
}

function buildAttachmentUpdatedSuccess(attachment: Attachment, note: Note, step: Step): ToolSuccess {
  const contentAvailable = hasReadableContent(attachment);
  const currentAttachmentUri = attachmentUri(attachment.id);

  return {
    ok: true,
    message: "Attachment metadata was updated.",
    changed: {
      attachmentsUpdated: 1
    },
    resources: {
      attachmentUri: currentAttachmentUri,
      contentUri: contentAvailable ? attachmentContentUri(attachment.id) : null,
      noteUri: noteUri(note.id),
      stepUri: stepUri(step.id),
      planUri: planUri(step.planId)
    },
    state: {
      attachmentId: attachment.id,
      planId: step.planId,
      stepId: step.id,
      noteId: note.id,
      name: attachment.name,
      mimeType: attachment.mimeType ?? "application/octet-stream",
      updatedAt: attachment.updatedAt
    },
    next: {
      recommendedResource: currentAttachmentUri,
      reason: "Read the updated attachment metadata if needed."
    }
  };
}

function readPatch(args: Record<string, unknown>): AttachmentUpdate {
  const patch: AttachmentUpdate = {};
  if ("name" in args) {
    patch.name = readName(args.name);
  }
  if ("mimeType" in args) {
    patch.mimeType = readMimeType(args.mimeType);
  }
  if (Object.keys(patch).length === 0) {
    throw invalidRequest("ATTACHMENT_UPDATE_EMPTY_PATCH", "Attachment update requires at least one editable field.", {
      fields: ["name", "mimeType"]
    });
  }
  return patch;
}

function readName(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("ATTACHMENT_NAME_REQUIRED", "Attachment name is required.", {
      field: "name",
      providedValue: value
    });
  }
  return value.trim();
}

function readMimeType(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("ATTACHMENT_CONTENT_INVALID", "Attachment mimeType is invalid.", {
      field: "mimeType",
      providedValue: value
    });
  }
  return value.trim();
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
