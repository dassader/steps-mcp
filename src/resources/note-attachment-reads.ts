import type { SqliteDatabase } from "../db/connection.js";
import type { Attachment, Note } from "../domain/types.js";
import { findAttachmentById, findAttachmentsByNoteId } from "../repositories/attachment.repository.js";
import { findNoteById } from "../repositories/note.repository.js";
import { attachmentMimeType, hasReadableContent, toAttachmentSummary, toAttachmentView } from "./attachment-views.js";
import { jsonContent, type ResourceContent } from "./content.js";
import { resourceNotFound, resourceStateError } from "./errors.js";
import { parseResourceUri } from "./parsers.js";
import {
  attachmentContentUri,
  attachmentUri,
  noteAttachmentsUri,
  noteUri,
  stepUri
} from "./uris.js";
import type { NoteAttachmentsView, NoteView } from "./views.js";

type NoteResourceSuffix = "detail" | "attachments";
type AttachmentResourceSuffix = "detail" | "content";

interface ParsedNoteResourceUri {
  uri: string;
  noteId: string;
  suffix: NoteResourceSuffix;
}

interface ParsedAttachmentResourceUri {
  uri: string;
  attachmentId: string;
  suffix: AttachmentResourceSuffix;
}

export function readNoteResource(db: SqliteDatabase, uri: string): ResourceContent | null {
  const parsed = parseNoteResourceUri(uri);
  if (!parsed) return null;

  const view = parsed.suffix === "detail" ? readNoteDetail(db, parsed.noteId) : readNoteAttachments(db, parsed.noteId);
  return jsonContent(uri, view);
}

export function readAttachmentResource(db: SqliteDatabase, uri: string): ResourceContent | null {
  const parsed = parseAttachmentResourceUri(uri);
  if (!parsed) return null;

  if (parsed.suffix === "content") {
    return readAttachmentContent(db, parsed.attachmentId);
  }

  return jsonContent(uri, readAttachmentMeta(db, parsed.attachmentId));
}

export function readNoteDetail(db: SqliteDatabase, noteId: string): NoteView {
  const note = requireNote(db, noteId);
  return {
    resourceType: "note",
    uri: noteUri(note.id),
    id: note.id,
    stepId: note.stepId,
    stepUri: stepUri(note.stepId),
    text: note.text,
    author: note.author,
    createdAt: note.createdAt,
    attachmentsUri: noteAttachmentsUri(note.id)
  };
}

export function readNoteAttachments(db: SqliteDatabase, noteId: string): NoteAttachmentsView {
  const note = requireNote(db, noteId);
  return {
    resourceType: "note_attachments",
    uri: noteAttachmentsUri(note.id),
    noteId: note.id,
    noteUri: noteUri(note.id),
    attachments: findAttachmentsByNoteId(db, note.id).map(toAttachmentSummary)
  };
}

export function readAttachmentMeta(db: SqliteDatabase, attachmentId: string) {
  return toAttachmentView(requireAttachment(db, attachmentId));
}

export function readAttachmentContent(db: SqliteDatabase, attachmentId: string): ResourceContent {
  const attachment = requireAttachment(db, attachmentId);
  if (!hasReadableContent(attachment)) {
    throw resourceStateError(
      "ATTACHMENT_CONTENT_UNAVAILABLE",
      "Attachment content is not available.",
      "This attachment has metadata but no stored text or blob content. Read attachment metadata to inspect its content availability.",
      {
        attachmentId,
        contentKind: attachment.contentKind,
        linkUri: attachment.linkUri
      }
    );
  }

  if (attachment.contentKind === "text") {
    return {
      uri: attachmentContentUri(attachment.id),
      mimeType: attachmentMimeType(attachment),
      text: attachment.textContent ?? ""
    };
  }

  return {
    uri: attachmentContentUri(attachment.id),
    mimeType: attachmentMimeType(attachment),
    blob: attachment.blobContent?.toString("base64") ?? ""
  };
}

function parseNoteResourceUri(uri: string): ParsedNoteResourceUri | null {
  const parsed = parseResourceUri<NoteResourceSuffix>(uri, {
    host: "notes",
    defaultSuffix: "detail",
    allowedSuffixes: ["attachments"],
    invalidUriCode: "INVALID_NOTE_RESOURCE_URI",
    invalidUriMessage: "Note resource URIs must include a note id and at most one suffix.",
    unknownSuffixCode: "UNKNOWN_NOTE_RESOURCE_SUFFIX",
    unknownSuffixMessage: "Unknown note resource suffix."
  });
  return parsed ? { uri: parsed.uri, noteId: parsed.id, suffix: parsed.suffix } : null;
}

function parseAttachmentResourceUri(uri: string): ParsedAttachmentResourceUri | null {
  const parsed = parseResourceUri<AttachmentResourceSuffix>(uri, {
    host: "attachments",
    defaultSuffix: "detail",
    allowedSuffixes: ["content"],
    invalidUriCode: "INVALID_ATTACHMENT_RESOURCE_URI",
    invalidUriMessage: "Attachment resource URIs must include an attachment id and at most one suffix.",
    unknownSuffixCode: "UNKNOWN_ATTACHMENT_RESOURCE_SUFFIX",
    unknownSuffixMessage: "Unknown attachment resource suffix."
  });
  return parsed ? { uri: parsed.uri, attachmentId: parsed.id, suffix: parsed.suffix } : null;
}

function requireNote(db: SqliteDatabase, noteId: string): Note {
  const note = findNoteById(db, noteId);
  if (!note) {
    throw resourceNotFound("NOTE_NOT_FOUND", "Note was not found.", { noteId });
  }
  return note;
}

function requireAttachment(db: SqliteDatabase, attachmentId: string): Attachment {
  const attachment = findAttachmentById(db, attachmentId);
  if (!attachment) {
    throw resourceNotFound("ATTACHMENT_NOT_FOUND", "Attachment was not found.", { attachmentId });
  }
  return attachment;
}
