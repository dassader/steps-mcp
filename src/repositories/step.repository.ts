import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { Step, StepStatus } from "../domain/types.js";
import { mapStep, type StepRow } from "./mappers.js";

export interface StepUpdate {
  title?: string;
  description?: string;
  order?: number;
}

export interface StepRelatedCounts {
  notes: number;
  transitions: number;
  attachments: number;
}

export function createStep(
  db: SqliteDatabase,
  planId: string,
  title: string,
  description: string,
  order: number,
  id = randomUUID()
): Step {
  db.prepare<[string, string, string, string, number]>(
    "INSERT INTO steps (id, plan_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)"
  ).run(id, planId, title, description, order);
  const step = findStepById(db, id);
  if (!step) throw new Error("Step was not created.");
  return step;
}

export function findStepById(db: SqliteDatabase, id: string): Step | null {
  const row = db.prepare<[string], StepRow>("SELECT * FROM steps WHERE id = ?").get(id);
  return row ? mapStep(row) : null;
}

export function findStepsByPlanId(db: SqliteDatabase, planId: string): Step[] {
  return db
    .prepare<[string], StepRow>(
      "SELECT * FROM steps WHERE plan_id = ? ORDER BY order_index ASC, created_at ASC, id ASC"
    )
    .all(planId)
    .map(mapStep);
}

export function findActiveStepByPlanId(db: SqliteDatabase, planId: string): Step | null {
  const row = db
    .prepare<[string], StepRow>(
      `
        SELECT * FROM steps
        WHERE plan_id = ? AND status IN ('implementing', 'verification')
        ORDER BY updated_at ASC, id ASC
        LIMIT 1
      `
    )
    .get(planId);
  return row ? mapStep(row) : null;
}

export function findNextTodoStep(db: SqliteDatabase, planId: string): Step | null {
  const row = db
    .prepare<[string], StepRow>(
      `
        SELECT s.*
        FROM steps s
        WHERE s.plan_id = ?
          AND s.status = 'todo'
          AND (
            s.order_index = 0
            OR NOT EXISTS (
              SELECT 1
              FROM steps previous
              WHERE previous.plan_id = s.plan_id
                AND previous.order_index > 0
                AND previous.order_index < s.order_index
                AND previous.status != 'done'
            )
          )
        ORDER BY s.order_index ASC, s.created_at ASC, s.id ASC
        LIMIT 1
      `
    )
    .get(planId);
  return row ? mapStep(row) : null;
}

export function findBlockedOrderedStep(db: SqliteDatabase, planId: string): Step | null {
  const row = db
    .prepare<[string], StepRow>(
      `
        SELECT * FROM steps
        WHERE plan_id = ? AND order_index > 0 AND status = 'blocked'
        ORDER BY order_index ASC, created_at ASC, id ASC
        LIMIT 1
      `
    )
    .get(planId);
  return row ? mapStep(row) : null;
}

export function findBlockedStepsByPlanId(db: SqliteDatabase, planId: string, limit: number): Step[] {
  return db
    .prepare<[string, number], StepRow>(
      `
        SELECT * FROM steps
        WHERE plan_id = ? AND status = 'blocked'
        ORDER BY order_index ASC, created_at ASC, id ASC
        LIMIT ?
      `
    )
    .all(planId, limit)
    .map(mapStep);
}

export function getStepRelatedCounts(db: SqliteDatabase, stepId: string): StepRelatedCounts {
  const row = db
    .prepare<
      [string, string, string],
      {
        notes: number;
        transitions: number;
        attachments: number;
      }
    >(
      `
        SELECT
          (SELECT COUNT(*) FROM notes WHERE step_id = ?) AS notes,
          (SELECT COUNT(*) FROM transitions WHERE step_id = ?) AS transitions,
          (
            SELECT COUNT(*)
            FROM attachments a
            JOIN notes n ON n.id = a.note_id
            WHERE n.step_id = ?
          ) AS attachments
      `
    )
    .get(stepId, stepId, stepId);

  return {
    notes: row?.notes ?? 0,
    transitions: row?.transitions ?? 0,
    attachments: row?.attachments ?? 0
  };
}

export function updateStep(db: SqliteDatabase, id: string, changes: StepUpdate): Step | null {
  const assignments: string[] = [];
  const values: unknown[] = [];
  if (changes.title !== undefined) {
    assignments.push("title = ?");
    values.push(changes.title);
  }
  if (changes.description !== undefined) {
    assignments.push("description = ?");
    values.push(changes.description);
  }
  if (changes.order !== undefined) {
    assignments.push("order_index = ?");
    values.push(changes.order);
  }
  if (assignments.length === 0) return findStepById(db, id);
  assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  db.prepare(`UPDATE steps SET ${assignments.join(", ")} WHERE id = ?`).run(...values, id);
  return findStepById(db, id);
}

export function updateStepStatus(db: SqliteDatabase, id: string, status: StepStatus): Step | null {
  db.prepare<[StepStatus, string]>(
    "UPDATE steps SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(status, id);
  return findStepById(db, id);
}

export function deleteStep(db: SqliteDatabase, id: string): number {
  return db.prepare<[string]>("DELETE FROM steps WHERE id = ?").run(id).changes;
}
