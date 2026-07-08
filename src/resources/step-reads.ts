import type { SqliteDatabase } from "../db/connection.js";
import { jsonContent, type JsonResourceContent } from "./content.js";
import { readStepAttachments } from "./steps/step-attachments.read.js";
import { readStepDetail } from "./steps/step-detail.read.js";
import { readStepHistory } from "./steps/step-history.read.js";
import { readStepNotes } from "./steps/step-notes.read.js";
import { readStepTransitions } from "./steps/step-transitions.read.js";
import { parseStepResourceUri, type ParsedStepResourceUri } from "./steps/step-utils.js";

export function readStepResource(db: SqliteDatabase, uri: string): JsonResourceContent | null {
  const parsed = parseStepResourceUri(uri);
  if (!parsed) return null;

  const view = readStepResourceView(db, parsed);
  return jsonContent(uri, view);
}

function readStepResourceView(db: SqliteDatabase, parsed: ParsedStepResourceUri) {
  switch (parsed.suffix) {
    case "detail":
      return readStepDetail(db, parsed.stepId);
    case "history":
      return readStepHistory(db, parsed.stepId);
    case "notes":
      return readStepNotes(db, parsed.stepId);
    case "transitions":
      return readStepTransitions(db, parsed.stepId);
    case "attachments":
      return readStepAttachments(db, parsed.stepId);
  }
}
