import type { SqliteDatabase } from "../../db/connection.js";
import type { Note } from "../../domain/types.js";
import { findNotesByStepId } from "../../repositories/note.repository.js";
import { summarizeText } from "../summaries.js";
import { noteAttachmentsUri, noteUri, stepNotesUri, stepUri } from "../uris.js";
import type { NoteSummary, StepNotesView } from "../views.js";
import { requireStep } from "./step-utils.js";

export function readStepNotes(db: SqliteDatabase, stepId: string): StepNotesView {
  const step = requireStep(db, stepId);
  return {
    resourceType: "step_notes",
    uri: stepNotesUri(step.id),
    stepId: step.id,
    stepUri: stepUri(step.id),
    notes: findNotesByStepId(db, step.id).map(toNoteSummary)
  };
}

function toNoteSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    uri: noteUri(note.id),
    author: note.author,
    createdAt: note.createdAt,
    summary: summarizeText(note.text),
    attachmentsUri: noteAttachmentsUri(note.id)
  };
}
