import type { StepStatus } from "../domain/types.js";
import type { SqliteDatabase } from "../db/connection.js";

export type PlanTimelineEventType = "note" | "transition" | "attachment";

export interface PlanTimelineEventRecord {
  type: PlanTimelineEventType;
  id: string;
  createdAt: string;
  stepId: string;
  stepTitle: string;
  noteText: string | null;
  noteId: string | null;
  fromStatus: StepStatus | null;
  toStatus: StepStatus | null;
  attachmentName: string | null;
  mimeType: string | null;
}

export interface PlanTimelinePageInput {
  planId: string;
  limit: number;
  type?: PlanTimelineEventType;
  after?: {
    createdAt: string;
    id: string;
  };
}

interface PlanTimelineEventRow {
  type: PlanTimelineEventType;
  id: string;
  created_at: string;
  step_id: string;
  step_title: string;
  note_text: string | null;
  note_id: string | null;
  from_status: StepStatus | null;
  to_status: StepStatus | null;
  attachment_name: string | null;
  mime_type: string | null;
}

export function findRecentPlanTimelineEvents(
  db: SqliteDatabase,
  planId: string,
  limit: number
): PlanTimelineEventRecord[] {
  return db
    .prepare<[string, string, string, number], PlanTimelineEventRow>(
      `
        SELECT * FROM (
          SELECT
            'note' AS type,
            n.id AS id,
            n.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            n.text AS note_text,
            n.id AS note_id,
            NULL AS from_status,
            NULL AS to_status,
            NULL AS attachment_name,
            NULL AS mime_type
          FROM notes n
          JOIN steps s ON s.id = n.step_id
          WHERE s.plan_id = ?

          UNION ALL

          SELECT
            'transition' AS type,
            t.id AS id,
            t.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            NULL AS note_text,
            t.note_id AS note_id,
            t.from_status AS from_status,
            t.to_status AS to_status,
            NULL AS attachment_name,
            NULL AS mime_type
          FROM transitions t
          JOIN steps s ON s.id = t.step_id
          WHERE s.plan_id = ?

          UNION ALL

          SELECT
            'attachment' AS type,
            a.id AS id,
            a.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            NULL AS note_text,
            a.note_id AS note_id,
            NULL AS from_status,
            NULL AS to_status,
            a.name AS attachment_name,
            a.mime_type AS mime_type
          FROM attachments a
          JOIN notes n ON n.id = a.note_id
          JOIN steps s ON s.id = n.step_id
          WHERE s.plan_id = ?
        )
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `
    )
    .all(planId, planId, planId, limit)
    .map(mapPlanTimelineEventRow);
}

export function findPlanTimelineEventsPage(db: SqliteDatabase, input: PlanTimelinePageInput): PlanTimelineEventRecord[] {
  return db
    .prepare<
      [string, string, string, string | null, string | null, string | null, string | null, string | null, string | null, number],
      PlanTimelineEventRow
    >(
      `
        SELECT * FROM (
          SELECT
            'note' AS type,
            n.id AS id,
            n.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            n.text AS note_text,
            n.id AS note_id,
            NULL AS from_status,
            NULL AS to_status,
            NULL AS attachment_name,
            NULL AS mime_type
          FROM notes n
          JOIN steps s ON s.id = n.step_id
          WHERE s.plan_id = ?

          UNION ALL

          SELECT
            'transition' AS type,
            t.id AS id,
            t.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            NULL AS note_text,
            t.note_id AS note_id,
            t.from_status AS from_status,
            t.to_status AS to_status,
            NULL AS attachment_name,
            NULL AS mime_type
          FROM transitions t
          JOIN steps s ON s.id = t.step_id
          WHERE s.plan_id = ?

          UNION ALL

          SELECT
            'attachment' AS type,
            a.id AS id,
            a.created_at AS created_at,
            s.id AS step_id,
            s.title AS step_title,
            NULL AS note_text,
            a.note_id AS note_id,
            NULL AS from_status,
            NULL AS to_status,
            a.name AS attachment_name,
            a.mime_type AS mime_type
          FROM attachments a
          JOIN notes n ON n.id = a.note_id
          JOIN steps s ON s.id = n.step_id
          WHERE s.plan_id = ?
        )
        WHERE (? IS NULL OR type = ?)
          AND (
            ? IS NULL
            OR created_at > ?
            OR (created_at = ? AND id > ?)
          )
        ORDER BY created_at ASC, id ASC
        LIMIT ?
      `
    )
    .all(
      input.planId,
      input.planId,
      input.planId,
      input.type ?? null,
      input.type ?? null,
      input.after?.createdAt ?? null,
      input.after?.createdAt ?? null,
      input.after?.createdAt ?? null,
      input.after?.id ?? null,
      input.limit
    )
    .map(mapPlanTimelineEventRow);
}

function mapPlanTimelineEventRow(row: PlanTimelineEventRow): PlanTimelineEventRecord {
  return {
    type: row.type,
    id: row.id,
    createdAt: row.created_at,
    stepId: row.step_id,
    stepTitle: row.step_title,
    noteText: row.note_text,
    noteId: row.note_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    attachmentName: row.attachment_name,
    mimeType: row.mime_type
  };
}
