import type { SqliteDatabase } from "../../db/connection.js";
import { getPlanSummary } from "../../services/plan-summary.service.js";
import { resourceNotFound } from "../errors.js";
import type { PlanReadOptions } from "./plan-utils.js";

export function readPlanSummary(db: SqliteDatabase, planId: string, options: PlanReadOptions) {
  const view = getPlanSummary(db, planId, options);
  if (!view) {
    throw resourceNotFound("PLAN_NOT_FOUND", "Plan was not found.", { planId });
  }
  return view;
}
