import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { StepStatus, Transition } from "../domain/types.js";
import { mapTransition, type TransitionRow } from "./mappers.js";

export function createTransition(
  db: SqliteDatabase,
  stepId: string,
  fromStatus: StepStatus,
  toStatus: StepStatus,
  noteId: string,
  id = randomUUID()
): Transition {
  db.prepare<[string, string, string, StepStatus, StepStatus]>(
    "INSERT INTO transitions (id, step_id, note_id, from_status, to_status) VALUES (?, ?, ?, ?, ?)"
  ).run(id, stepId, noteId, fromStatus, toStatus);
  const transition = findTransitionById(db, id);
  if (!transition) throw new Error("Transition was not created.");
  return transition;
}

export function findTransitionById(db: SqliteDatabase, id: string): Transition | null {
  const row = db.prepare<[string], TransitionRow>("SELECT * FROM transitions WHERE id = ?").get(id);
  return row ? mapTransition(row) : null;
}

export function findTransitionsByStepId(db: SqliteDatabase, stepId: string): Transition[] {
  return db
    .prepare<[string], TransitionRow>("SELECT * FROM transitions WHERE step_id = ? ORDER BY created_at ASC, id ASC")
    .all(stepId)
    .map(mapTransition);
}

export function findTransitionsByPlanId(db: SqliteDatabase, planId: string): Transition[] {
  return db
    .prepare<[string], TransitionRow>(
      `
        SELECT t.*
        FROM transitions t
        JOIN steps s ON s.id = t.step_id
        WHERE s.plan_id = ?
        ORDER BY t.created_at ASC, t.id ASC
      `
    )
    .all(planId)
    .map(mapTransition);
}

export function deleteTransitionsByStepId(db: SqliteDatabase, stepId: string): number {
  return db.prepare<[string]>("DELETE FROM transitions WHERE step_id = ?").run(stepId).changes;
}
