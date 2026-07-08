import type { SqliteDatabase } from "../../db/connection.js";
import type { Step } from "../../domain/types.js";
import { findStepById } from "../../repositories/step.repository.js";
import { resourceNotFound } from "../errors.js";
import { parseResourceUri } from "../parsers.js";

export type StepResourceSuffix = "detail" | "history" | "notes" | "transitions" | "attachments";

export interface ParsedStepResourceUri {
  uri: string;
  stepId: string;
  suffix: StepResourceSuffix;
}

export function parseStepResourceUri(uri: string): ParsedStepResourceUri | null {
  const parsed = parseResourceUri<StepResourceSuffix>(uri, {
    host: "steps",
    defaultSuffix: "detail",
    allowedSuffixes: ["history", "notes", "transitions", "attachments"],
    invalidUriCode: "INVALID_STEP_RESOURCE_URI",
    invalidUriMessage: "Step resource URIs must include a step id and at most one suffix.",
    unknownSuffixCode: "UNKNOWN_STEP_RESOURCE_SUFFIX",
    unknownSuffixMessage: "Unknown step resource suffix."
  });
  return parsed ? { uri: parsed.uri, stepId: parsed.id, suffix: parsed.suffix } : null;
}

export function requireStep(db: SqliteDatabase, stepId: string): Step {
  const step = findStepById(db, stepId);
  if (!step) {
    throw resourceNotFound("STEP_NOT_FOUND", "Step was not found.", { stepId });
  }
  return step;
}
