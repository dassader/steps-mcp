import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { Attachment, AttachmentContentKind } from "../domain/types.js";
import { mapAttachment, type AttachmentRow } from "./mappers.js";

export interface AttachmentContentInput {
  text?: string;
  blob?: Buffer;
  linkUri?: string;
}

export interface AttachmentUpdate {
  name?: string;
  mimeType?: string | null;
}

function contentKind(content?: AttachmentContentInput): AttachmentContentKind {
  if (content?.text !== undefined) return "text";
  if (content?.blob !== undefined) return "blob";
  if (content?.linkUri !== undefined) return "link";
  return "none";
}

function contentSize(content?: AttachmentContentInput): number {
  if (content?.text !== undefined) return Buffer.byteLength(content.text);
  if (content?.blob !== undefined) return content.blob.byteLength;
  return 0;
}

export function createAttachment(
  db: SqliteDatabase,
  noteId: string,
  name: string,
  mimeType: string | null,
  content?: AttachmentContentInput,
  id = randomUUID()
): Attachment {
  db.prepare<[string, string, string, string | null, number, AttachmentContentKind, string | null, Buffer | null, string | null]>(
    `
      INSERT INTO attachments (
        id, note_id, name, mime_type, size, content_kind, text_content, blob_content, link_uri
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    noteId,
    name,
    mimeType,
    contentSize(content),
    contentKind(content),
    content?.text ?? null,
    content?.blob ?? null,
    content?.linkUri ?? null
  );
  const attachment = findAttachmentById(db, id);
  if (!attachment) throw new Error("Attachment was not created.");
  return attachment;
}

export function findAttachmentById(db: SqliteDatabase, id: string): Attachment | null {
  const row = db.prepare<[string], AttachmentRow>("SELECT * FROM attachments WHERE id = ?").get(id);
  return row ? mapAttachment(row) : null;
}

export function findAttachmentsByNoteId(db: SqliteDatabase, noteId: string): Attachment[] {
  return db
    .prepare<[string], AttachmentRow>("SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at ASC, id ASC")
    .all(noteId)
    .map(mapAttachment);
}

export function findAttachmentsByStepId(db: SqliteDatabase, stepId: string): Attachment[] {
  return db
    .prepare<[string], AttachmentRow>(
      `
        SELECT a.*
        FROM attachments a
        JOIN notes n ON n.id = a.note_id
        WHERE n.step_id = ?
        ORDER BY a.created_at ASC, a.id ASC
      `
    )
    .all(stepId)
    .map(mapAttachment);
}

export function countAttachmentsByNoteId(db: SqliteDatabase, noteId: string): number {
  const row = db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM attachments WHERE note_id = ?").get(noteId);
  return row?.count ?? 0;
}

export function updateAttachment(db: SqliteDatabase, id: string, changes: AttachmentUpdate): Attachment | null {
  const assignments: string[] = [];
  const values: unknown[] = [];
  if (changes.name !== undefined) {
    assignments.push("name = ?");
    values.push(changes.name);
  }
  if (changes.mimeType !== undefined) {
    assignments.push("mime_type = ?");
    values.push(changes.mimeType);
  }
  if (assignments.length === 0) return findAttachmentById(db, id);
  assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  db.prepare(`UPDATE attachments SET ${assignments.join(", ")} WHERE id = ?`).run(...values, id);
  return findAttachmentById(db, id);
}

export function deleteAttachment(db: SqliteDatabase, id: string): number {
  return db.prepare<[string]>("DELETE FROM attachments WHERE id = ?").run(id).changes;
}
