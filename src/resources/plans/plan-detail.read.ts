import type { SqliteDatabase } from "../../db/connection.js";
import { getStepCounts } from "../../repositories/plan.repository.js";
import { getNextStepView } from "../../services/next-step.service.js";
import {
  planResourceLinks,
  planUri,
  userFacingLinks
} from "../uris.js";
import { requirePlan, type PlanReadOptions } from "./plan-utils.js";

export function readPlanDetail(db: SqliteDatabase, planId: string, options: PlanReadOptions) {
  const plan = requirePlan(db, planId);
  const resources = planResourceLinks(plan.id);
  const nextStep = getNextStepView(db, plan.id, options);

  return {
    resourceType: "plan",
    uri: planUri(plan.id),
    id: plan.id,
    title: plan.title,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    stepCounts: getStepCounts(db, plan.id),
    resources,
    stepsUri: resources.stepsUri,
    nextUri: resources.nextUri,
    summaryUri: resources.summaryUri,
    timelineUri: resources.timelineUri,
    links: userFacingLinks(options.publicUrl, plan.id),
    planNextAction: nextStep?.nextAction
  };
}
