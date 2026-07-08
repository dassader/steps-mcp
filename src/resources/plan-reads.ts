import type { SqliteDatabase } from "../db/connection.js";
import { jsonContent, type JsonResourceContent } from "./content.js";
import { readPlanDetail } from "./plans/plan-detail.read.js";
import { readPlanNext } from "./plans/plan-next.read.js";
import { readPlanSteps } from "./plans/plan-steps.read.js";
import { readPlanSummary } from "./plans/plan-summary.read.js";
import { readPlanTimeline } from "./plans/plan-timeline.read.js";
import { parsePlanResourceUri, type ParsedPlanResourceUri, type PlanReadOptions } from "./plans/plan-utils.js";

export type { PlanReadOptions };

export function readPlanResource(
  db: SqliteDatabase,
  uri: string,
  options: PlanReadOptions
): JsonResourceContent | null {
  const parsed = parsePlanResourceUri(uri);
  if (!parsed) return null;

  const view = readPlanResourceView(db, parsed, options);
  return jsonContent(uri, view);
}

function readPlanResourceView(db: SqliteDatabase, parsed: ParsedPlanResourceUri, options: PlanReadOptions) {
  switch (parsed.suffix) {
    case "detail":
      return readPlanDetail(db, parsed.planId, options);
    case "steps":
      return readPlanSteps(db, parsed.planId, options);
    case "next":
      return readPlanNext(db, parsed.planId, options);
    case "summary":
      return readPlanSummary(db, parsed.planId, options);
    case "timeline":
      return readPlanTimeline(db, parsed, options);
  }
}
