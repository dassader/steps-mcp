import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { Author, Note } from "../domain/types.js";
import { mapNote, type NoteRow } from "./mappers.js";

export function createNote(db: SqliteDatabase, stepId: string, text: string, author: Author, id = randomUUID()): Note {
  db.prepare<[string, string, string, Author]>("INSERT INTO notes (id, step_id, text, author) VALUES (?, ?, ?, ?)").run(
    id,
    stepId,
    text,
    author
  );
  const note = findNoteById(db, id);
  if (!note) throw new Error("Note was not created.");
  return note;
}

export function findNoteById(db: SqliteDatabase, id: string): Note | null {
  const row = db.prepare<[string], NoteRow>("SELECT * FROM notes WHERE id = ?").get(id);
  return row ? mapNote(row) : null;
}

export function findNotesByStepId(db: SqliteDatabase, stepId: string): Note[] {
  return db
    .prepare<[string], NoteRow>("SELECT * FROM notes WHERE step_id = ? ORDER BY created_at ASC, id ASC")
    .all(stepId)
    .map(mapNote);
}

export function noteHasTransitionReference(db: SqliteDatabase, noteId: string): boolean {
  const row = db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM transitions WHERE note_id = ?").get(noteId);
  return (row?.count ?? 0) > 0;
}

export function deleteNote(db: SqliteDatabase, id: string): number {
  return db.prepare<[string]>("DELETE FROM notes WHERE id = ?").run(id).changes;
}
