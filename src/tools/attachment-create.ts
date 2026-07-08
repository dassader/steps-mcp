import type { Attachment, Note, Step } from "../domain/types.js";
import { createAttachment, type AttachmentContentInput } from "../repositories/attachment.repository.js";
import { findNoteById } from "../repositories/note.repository.js";
import { findStepById } from "../repositories/step.repository.js";
import { hasReadableContent } from "../resources/attachment-views.js";
import { attachmentContentUri, attachmentUri, noteAttachmentsUri, noteUri, planUri, stepUri } from "../resources/uris.js";
import type { ToolCallContext } from "./types.js";
import { ToolError, invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

const maxInlineAttachmentBytes = 1_000_000;

export function attachmentCreateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const noteId = String(args.noteId);
  const name = readName(args.name);
  const content = readContent(args.content, args.mimeType);
  const mimeType = readMimeType(args.mimeType, content);
  const note = requireNote(context, noteId);
  const step = requireStep(context, note.stepId);
  const attachment = createAttachment(context.db, note.id, name, mimeType, content.value);

  return buildAttachmentCreatedSuccess(attachment, note, step);
}

function buildAttachmentCreatedSuccess(attachment: Attachment, note: Note, step: Step): ToolSuccess {
  const contentAvailable = hasReadableContent(attachment);
  const currentAttachmentUri = attachmentUri(attachment.id);

  return {
    ok: true,
    message: "Attachment was created.",
    changed: {
      attachmentsCreated: 1,
      contentStored: contentAvailable
    },
    resources: {
      attachmentUri: currentAttachmentUri,
      contentUri: contentAvailable ? attachmentContentUri(attachment.id) : null,
      noteUri: noteUri(note.id),
      stepUri: stepUri(step.id),
      planUri: planUri(step.planId),
      noteAttachmentsUri: noteAttachmentsUri(note.id)
    },
    state: {
      attachmentId: attachment.id,
      planId: step.planId,
      stepId: step.id,
      noteId: note.id,
      name: attachment.name,
      mimeType: attachment.mimeType ?? "application/octet-stream",
      size: attachment.size,
      linkUri: attachment.linkUri,
      contentAvailable
    },
    next: {
      recommendedResource: currentAttachmentUri,
      reason: "Read attachment metadata before reading file content."
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
    throw new Error("Attachment parent step was not found.");
  }
  return step;
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

function readMimeType(value: unknown, content: ParsedContent): string | null {
  if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
    throw invalidAttachmentContent("Attachment mimeType is invalid.", {
      field: "mimeType",
      providedValue: value
    });
  }
  if (content.kind === "blob" && typeof value !== "string") {
    throw invalidAttachmentContent("Blob attachments require mimeType.", {
      providedContentFields: ["blob"],
      missingFields: ["mimeType"]
    });
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (content.kind === "text") {
    return "text/plain";
  }
  return null;
}

interface ParsedContent {
  kind: "none" | "text" | "blob" | "link";
  value?: AttachmentContentInput;
}

function readContent(value: unknown, mimeType: unknown): ParsedContent {
  if (value === undefined) return { kind: "none" };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidAttachmentContent("Attachment content must be an object.", {
      field: "content",
      providedValue: value
    });
  }

  const content = value as Record<string, unknown>;
  const providedContentFields = ["text", "blob", "linkUri"].filter((field) => content[field] !== undefined);
  if (providedContentFields.length > 1) {
    throw invalidAttachmentContent("Attachment content must contain only one content field.", {
      providedContentFields
    });
  }
  if (providedContentFields.length === 0) {
    return { kind: "none" };
  }

  if (content.text !== undefined) {
    if (typeof content.text !== "string") {
      throw invalidAttachmentContent("Attachment text content must be a string.", {
        providedContentFields,
        field: "content.text",
        providedValue: content.text
      });
    }
    assertContentSize(Buffer.byteLength(content.text), providedContentFields);
    return { kind: "text", value: { text: content.text } };
  }

  if (content.blob !== undefined) {
    if (typeof content.blob !== "string") {
      throw invalidAttachmentContent("Attachment blob content must be a base64 string.", {
        providedContentFields,
        field: "content.blob",
        providedValue: content.blob
      });
    }
    if (typeof mimeType !== "string" || mimeType.trim() === "") {
      throw invalidAttachmentContent("Blob attachments require mimeType.", {
        providedContentFields,
        missingFields: ["mimeType"]
      });
    }
    const blob = decodeBase64(content.blob, providedContentFields);
    assertContentSize(blob.byteLength, providedContentFields);
    return { kind: "blob", value: { blob } };
  }

  if (typeof content.linkUri !== "string" || content.linkUri.trim() === "") {
    throw invalidAttachmentContent("Attachment linkUri must be a non-empty string.", {
      providedContentFields,
      field: "content.linkUri",
      providedValue: content.linkUri
    });
  }
  return { kind: "link", value: { linkUri: content.linkUri.trim() } };
}

function decodeBase64(value: string, providedContentFields: string[]): Buffer {
  const normalized = value.trim();
  if (!isBase64(normalized)) {
    throw invalidAttachmentContent("Attachment blob content must be valid base64.", {
      providedContentFields,
      field: "content.blob"
    });
  }
  return Buffer.from(normalized, "base64");
}

function isBase64(value: string): boolean {
  if (value === "" || value.length % 4 !== 0) return false;
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

function assertContentSize(size: number, providedContentFields: string[]): void {
  if (size <= maxInlineAttachmentBytes) return;
  throw invalidRequest("ATTACHMENT_CONTENT_TOO_LARGE", "Attachment content is too large.", {
    providedContentFields,
    size,
    maxInlineAttachmentBytes
  });
}

function invalidAttachmentContent(message: string, details: Record<string, unknown>) {
  return invalidRequest("ATTACHMENT_CONTENT_INVALID", message, details);
}
