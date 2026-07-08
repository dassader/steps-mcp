import type { SqliteDatabase } from "../../db/connection.js";
import {
  findPlanTimelineEventsPage,
  type PlanTimelineEventRecord,
  type PlanTimelineEventType
} from "../../repositories/timeline.repository.js";
import { buildPageInfo, decodeCursor, encodeCursor, InvalidCursorError } from "../../utils/pagination.js";
import { invalidResourceRequest } from "../errors.js";
import { readLimitedPositiveIntegerParam } from "../parsers.js";
import { summarizeText } from "../summaries.js";
import { planTimelineUri, planUri, stepUri, userFacingLinks } from "../uris.js";
import type { PlanTimelineEvent, PlanTimelineView } from "../views.js";
import { requirePlan, type ParsedPlanResourceUri, type PlanReadOptions } from "./plan-utils.js";

const timelineTypes = new Set<PlanTimelineEventType>(["note", "transition", "attachment"]);

export function readPlanTimeline(db: SqliteDatabase, parsed: ParsedPlanResourceUri, options: PlanReadOptions): PlanTimelineView {
  const plan = requirePlan(db, parsed.planId);
  const limit = parseTimelineLimit(parsed.searchParams);
  const type = parseTimelineType(parsed.searchParams);
  const scope = timelineCursorScope(plan.id, type);
  const after = parseTimelineCursor(parsed.searchParams.get("cursor"), scope);
  const rows = findPlanTimelineEventsPage(db, { planId: plan.id, limit: limit + 1, type, after });
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor = hasMore ? createTimelineCursor(scope, pageRows.at(-1)) : undefined;

  return {
    resourceType: "plan_timeline",
    uri: planTimelineUri(plan.id),
    planId: plan.id,
    planUri: planUri(plan.id),
    planStatus: plan.status,
    links: userFacingLinks(options.publicUrl, plan.id),
    events: pageRows.map(toTimelineEvent),
    page: buildPageInfo(limit, pageRows, hasMore, nextCursor)
  };
}

function parseTimelineLimit(searchParams: URLSearchParams): number {
  return readLimitedPositiveIntegerParam(searchParams, "limit", {
    defaultLimit: 50,
    maxLimit: 100,
    invalidCode: "INVALID_TIMELINE_LIMIT",
    invalidMessage: "Timeline limit must be a positive integer."
  });
}

function parseTimelineType(searchParams: URLSearchParams): PlanTimelineEventType | undefined {
  const rawType = searchParams.get("type");
  if (rawType === null) return undefined;
  if (timelineTypes.has(rawType as PlanTimelineEventType)) {
    return rawType as PlanTimelineEventType;
  }
  throw invalidResourceRequest("INVALID_TIMELINE_TYPE", "Timeline type must be note, transition, or attachment.", { type: rawType });
}

function parseTimelineCursor(cursor: string | null, scope: string): { createdAt: string; id: string } | undefined {
  if (!cursor) return undefined;

  try {
    const payload = decodeCursor(cursor, scope);
    if (typeof payload.createdAt !== "string" || typeof payload.lastId !== "string") {
      throw new InvalidCursorError("Timeline cursor is missing createdAt or lastId.");
    }
    return { createdAt: payload.createdAt, id: payload.lastId };
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw invalidResourceRequest("INVALID_TIMELINE_CURSOR", error.message, { cursor });
    }
    throw error;
  }
}

function createTimelineCursor(scope: string, event: PlanTimelineEventRecord | undefined): string | undefined {
  if (!event) return undefined;
  return encodeCursor({ scope, createdAt: event.createdAt, lastId: event.id });
}

function timelineCursorScope(planId: string, type: PlanTimelineEventType | undefined): string {
  return `plans:${planId}:timeline:${type ?? "all"}:created_at_asc`;
}

function toTimelineEvent(event: PlanTimelineEventRecord): PlanTimelineEvent {
  const base = {
    id: event.id,
    stepId: event.stepId,
    stepUri: stepUri(event.stepId),
    stepTitle: event.stepTitle,
    createdAt: event.createdAt
  };

  if (event.type === "transition") {
    return {
      ...base,
      type: "transition",
      uri: `${stepUri(event.stepId)}/transitions`,
      summary: `${event.fromStatus} -> ${event.toStatus}`,
      fromStatus: event.fromStatus ?? "todo",
      toStatus: event.toStatus ?? "todo",
      noteId: event.noteId ?? "",
      noteUri: `steps://notes/${event.noteId ?? ""}`
    };
  }

  if (event.type === "attachment") {
    const name = event.attachmentName ?? "attachment";
    return {
      ...base,
      type: "attachment",
      uri: `steps://attachments/${event.id}`,
      summary: `Attachment added: ${name}`,
      noteId: event.noteId ?? "",
      noteUri: `steps://notes/${event.noteId ?? ""}`,
      name,
      mimeType: event.mimeType ?? "application/octet-stream"
    };
  }

  return {
    ...base,
    type: "note",
    uri: `steps://notes/${event.id}`,
    summary: summarizeText(event.noteText ?? "")
  };
}
