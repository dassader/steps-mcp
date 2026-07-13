import { randomUUID } from "node:crypto";

import type { Plan, PlanStatus, StepCounts } from "../domain/types.js";
import type { SqliteDatabase } from "../db/connection.js";
import { decodeCursor, encodeCursor, InvalidCursorError } from "../utils/pagination.js";
import { mapPlan, type PlanRow } from "./mappers.js";

export interface PlanListFilters {
  status?: PlanStatus;
  query?: string;
  hasActiveStep?: boolean;
  limit?: number;
  cursor?: string;
}

export interface PlanListResult {
  plans: Plan[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface PlanUpdate {
  title?: string;
  status?: PlanStatus;
  blockerReason?: string | null;
}

export interface PlanContainedCounts {
  steps: number;
  notes: number;
  transitions: number;
  attachments: number;
}

const emptyStepCounts: StepCounts = {
  total: 0,
  todo: 0,
  implementing: 0,
  verification: 0,
  blocked: 0,
  done: 0
};

function normalizeLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 20, 1), 100);
}

function cursorScope(filters: PlanListFilters): string {
  return [
    "plans:list",
    `status=${filters.status ?? ""}`,
    `query=${filters.query?.trim().toLowerCase() ?? ""}`,
    `hasActiveStep=${filters.hasActiveStep ?? ""}`,
    "sort=updated_desc"
  ].join("|");
}

function decodePlanListOffset(filters: PlanListFilters): number {
  if (!filters.cursor) return 0;
  const payload = decodeCursor(filters.cursor, cursorScope(filters));
  if (!Number.isInteger(payload.offset) || (payload.offset as number) < 0) {
    throw new InvalidCursorError("Plan list cursor is missing a valid offset.");
  }
  return payload.offset as number;
}

export function createPlan(db: SqliteDatabase, title: string, id = randomUUID()): Plan {
  db.prepare<[string, string]>("INSERT INTO plans (id, title) VALUES (?, ?)").run(id, title);
  const plan = findPlanById(db, id);
  if (!plan) throw new Error("Plan was not created.");
  return plan;
}

export function findPlanById(db: SqliteDatabase, id: string): Plan | null {
  const row = db.prepare<[string], PlanRow>("SELECT * FROM plans WHERE id = ?").get(id);
  return row ? mapPlan(row) : null;
}

export function updatePlan(db: SqliteDatabase, id: string, changes: PlanUpdate): Plan | null {
  const assignments: string[] = [];
  const values: unknown[] = [];
  if (changes.title !== undefined) {
    assignments.push("title = ?");
    values.push(changes.title);
  }
  if (changes.status !== undefined) {
    assignments.push("status = ?");
    values.push(changes.status);
  }
  if (changes.blockerReason !== undefined) {
    assignments.push("blocker_reason = ?");
    values.push(changes.blockerReason);
  }
  if (assignments.length === 0) return findPlanById(db, id);

  assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  db.prepare(`UPDATE plans SET ${assignments.join(", ")} WHERE id = ?`).run(...values, id);
  return findPlanById(db, id);
}

export function updatePlanStatus(
  db: SqliteDatabase,
  id: string,
  status: PlanStatus,
  blockerReason?: string | null
): Plan | null {
  return updatePlan(db, id, { status, blockerReason });
}

export function deletePlan(db: SqliteDatabase, id: string): number {
  return db.prepare<[string]>("DELETE FROM plans WHERE id = ?").run(id).changes;
}

export function getPlanContainedCounts(db: SqliteDatabase, planId: string): PlanContainedCounts {
  const row = db
    .prepare<
      [string, string, string, string],
      {
        steps: number;
        notes: number;
        transitions: number;
        attachments: number;
      }
    >(
      `
        SELECT
          (SELECT COUNT(*) FROM steps WHERE plan_id = ?) AS steps,
          (
            SELECT COUNT(*)
            FROM notes n
            JOIN steps s ON s.id = n.step_id
            WHERE s.plan_id = ?
          ) AS notes,
          (
            SELECT COUNT(*)
            FROM transitions t
            JOIN steps s ON s.id = t.step_id
            WHERE s.plan_id = ?
          ) AS transitions,
          (
            SELECT COUNT(*)
            FROM attachments a
            JOIN notes n ON n.id = a.note_id
            JOIN steps s ON s.id = n.step_id
            WHERE s.plan_id = ?
          ) AS attachments
      `
    )
    .get(planId, planId, planId, planId);

  return {
    steps: row?.steps ?? 0,
    notes: row?.notes ?? 0,
    transitions: row?.transitions ?? 0,
    attachments: row?.attachments ?? 0
  };
}

export function listPlans(db: SqliteDatabase, filters: PlanListFilters = {}): PlanListResult {
  const limit = normalizeLimit(filters.limit);
  const offset = decodePlanListOffset(filters);

  const where: string[] = [];
  const values: unknown[] = [];
  if (filters.status) {
    where.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.query?.trim()) {
    const normalizedQuery = filters.query.trim().toLowerCase();
    where.push("(lower(p.title) LIKE ? OR lower(p.id) = ?)");
    values.push(`%${normalizedQuery}%`, normalizedQuery);
  }
  if (filters.hasActiveStep !== undefined) {
    where.push(`
      ${filters.hasActiveStep ? "EXISTS" : "NOT EXISTS"} (
        SELECT 1 FROM steps s
        WHERE s.plan_id = p.id AND s.status IN ('implementing', 'verification')
      )
    `);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare<unknown[], PlanRow>(
      `
        SELECT p.*
        FROM plans p
        ${whereSql}
        ORDER BY p.updated_at DESC, p.id ASC
        LIMIT ? OFFSET ?
      `
    )
    .all(...values, limit + 1, offset);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  return {
    plans: pageRows.map(mapPlan),
    page: {
      limit,
      hasMore,
      nextCursor: hasMore ? encodeCursor({ scope: cursorScope(filters), offset: offset + limit }) : null
    }
  };
}

export function getStepCounts(db: SqliteDatabase, planId: string): StepCounts {
  const rows = db
    .prepare<[string], { status: keyof StepCounts; count: number }>(
      "SELECT status, COUNT(*) AS count FROM steps WHERE plan_id = ? GROUP BY status"
    )
    .all(planId);

  return rows.reduce<StepCounts>(
    (counts, row) => ({
      ...counts,
      total: counts.total + row.count,
      [row.status]: row.count
    }),
    { ...emptyStepCounts }
  );
}
