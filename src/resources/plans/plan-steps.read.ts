import type { SqliteDatabase } from "../../db/connection.js";
import { findStepsByPlanId } from "../../repositories/step.repository.js";
import { planNextUri, planStepsUri, planUri, userFacingLinks } from "../uris.js";
import { requirePlan, toStepSummary, type PlanReadOptions } from "./plan-utils.js";

export function readPlanSteps(db: SqliteDatabase, planId: string, options: PlanReadOptions) {
  const plan = requirePlan(db, planId);
  const steps = findStepsByPlanId(db, plan.id);

  return {
    resourceType: "plan_steps",
    uri: planStepsUri(plan.id),
    planId: plan.id,
    planUri: planUri(plan.id),
    planStatus: plan.status,
    steps: steps.map(toStepSummary),
    nextUri: planNextUri(plan.id),
    links: userFacingLinks(options.publicUrl, plan.id)
  };
}
