import type { SqliteDatabase } from "../../db/connection.js";
import type { Attachment, Note, Transition } from "../../domain/types.js";
import { findAttachmentsByStepId } from "../../repositories/attachment.repository.js";
import { findNotesByStepId } from "../../repositories/note.repository.js";
import { findTransitionsByStepId } from "../../repositories/transition.repository.js";
import { summarizeText } from "../summaries.js";
import { attachmentUri, noteUri, stepHistoryUri, stepUri, stepTransitionsUri } from "../uris.js";
import type {
  HistoryAttachmentEvent,
  HistoryEvent,
  HistoryNoteEvent,
  HistoryTransitionEvent,
  StepHistoryView
} from "../views.js";
import { requireStep } from "./step-utils.js";

export function readStepHistory(db: SqliteDatabase, stepId: string): StepHistoryView {
  const step = requireStep(db, stepId);
  const notes = findNotesByStepId(db, step.id).map(toHistoryNoteEvent);
  const transitions = findTransitionsByStepId(db, step.id).map(toHistoryTransitionEvent);
  const attachments = findAttachmentsByStepId(db, step.id).map(toHistoryAttachmentEvent);

  return {
    resourceType: "step_history",
    uri: stepHistoryUri(step.id),
    stepId: step.id,
    stepUri: stepUri(step.id),
    notes,
    transitions,
    attachments,
    events: sortHistoryEvents([...notes, ...transitions, ...attachments])
  };
}

function toHistoryNoteEvent(note: Note): HistoryNoteEvent {
  return {
    type: "note",
    id: note.id,
    uri: noteUri(note.id),
    createdAt: note.createdAt,
    summary: summarizeText(note.text)
  };
}

function toHistoryTransitionEvent(transition: Transition): HistoryTransitionEvent {
  return {
    type: "transition",
    id: transition.id,
    uri: stepTransitionsUri(transition.stepId),
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    noteId: transition.noteId,
    noteUri: noteUri(transition.noteId),
    createdAt: transition.createdAt
  };
}

function toHistoryAttachmentEvent(attachment: Attachment): HistoryAttachmentEvent {
  return {
    type: "attachment",
    id: attachment.id,
    uri: attachmentUri(attachment.id),
    noteId: attachment.noteId,
    noteUri: noteUri(attachment.noteId),
    name: attachment.name,
    mimeType: attachment.mimeType ?? "application/octet-stream",
    createdAt: attachment.createdAt
  };
}

function sortHistoryEvents(events: HistoryEvent[]): HistoryEvent[] {
  return events.sort((left, right) => {
    const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
    return byCreatedAt === 0 ? left.id.localeCompare(right.id) : byCreatedAt;
  });
}
