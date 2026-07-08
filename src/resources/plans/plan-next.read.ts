import type { SqliteDatabase } from "../../db/connection.js";
import { getNextStepView } from "../../services/next-step.service.js";
import { resourceNotFound } from "../errors.js";
import type { PlanReadOptions } from "./plan-utils.js";

export function readPlanNext(db: SqliteDatabase, planId: string, options: PlanReadOptions) {
  const view = getNextStepView(db, planId, options);
  if (!view) {
    throw resourceNotFound("PLAN_NOT_FOUND", "Plan was not found.", { planId });
  }
  return view;
}
