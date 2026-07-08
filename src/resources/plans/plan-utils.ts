import type { SqliteDatabase } from "../../db/connection.js";
import type { Plan, Step } from "../../domain/types.js";
import { findPlanById } from "../../repositories/plan.repository.js";
import { resourceNotFound } from "../errors.js";
import { parseResourceUri } from "../parsers.js";
import {
  stepAttachmentsUri,
  stepHistoryUri,
  stepNotesUri,
  stepTransitionsUri,
  stepUri
} from "../uris.js";
import type { StepSummary } from "../views.js";

export interface PlanReadOptions {
  publicUrl: string;
}

export type PlanResourceSuffix = "detail" | "steps" | "next" | "summary" | "timeline";

export interface ParsedPlanResourceUri {
  uri: string;
  planId: string;
  suffix: PlanResourceSuffix;
  searchParams: URLSearchParams;
}

export function parsePlanResourceUri(uri: string): ParsedPlanResourceUri | null {
  const parsed = parseResourceUri<PlanResourceSuffix>(uri, {
    host: "plans",
    defaultSuffix: "detail",
    allowedSuffixes: ["steps", "next", "summary", "timeline"],
    invalidUriCode: "INVALID_PLAN_RESOURCE_URI",
    invalidUriMessage: "Plan resource URIs must include a plan id and at most one suffix.",
    unknownSuffixCode: "UNKNOWN_PLAN_RESOURCE_SUFFIX",
    unknownSuffixMessage: "Unknown plan resource suffix."
  });
  return parsed ? { uri: parsed.uri, planId: parsed.id, suffix: parsed.suffix, searchParams: parsed.searchParams } : null;
}

export function requirePlan(db: SqliteDatabase, planId: string): Plan {
  const plan = findPlanById(db, planId);
  if (!plan) {
    throw resourceNotFound("PLAN_NOT_FOUND", "Plan was not found.", { planId });
  }
  return plan;
}

export function toStepSummary(step: Step): StepSummary {
  return {
    id: step.id,
    uri: stepUri(step.id),
    title: step.title,
    description: step.description,
    order: step.order,
    status: step.status,
    updatedAt: step.updatedAt,
    historyUri: stepHistoryUri(step.id),
    notesUri: stepNotesUri(step.id),
    transitionsUri: stepTransitionsUri(step.id),
    attachmentsUri: stepAttachmentsUri(step.id)
  };
}
