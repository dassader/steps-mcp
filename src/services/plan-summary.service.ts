import type { SqliteDatabase } from "../db/connection.js";
import { findPlanById, getStepCounts } from "../repositories/plan.repository.js";
import { findActiveStepByPlanId, findBlockedStepsByPlanId } from "../repositories/step.repository.js";
import { findRecentPlanTimelineEvents } from "../repositories/timeline.repository.js";
import {
  planNextUri,
  planResourceLinks,
  planSummaryUri,
  planUri,
  userFacingLinks
} from "../resources/uris.js";
import type { PlanSummaryView } from "../resources/views.js";
import { getNextStepView, type NextStepOptions } from "./next-step.service.js";
import { toPlanTimelineEvent } from "./plan-summary/builders.js";
import { toStepSummary } from "./shared/step-summary.js";

export interface PlanSummaryOptions extends NextStepOptions {
  blockedLimit?: number;
  recentEventsLimit?: number;
}

const defaultBlockedLimit = 20;
const defaultRecentEventsLimit = 5;

export function getPlanSummary(
  db: SqliteDatabase,
  planId: string,
  options: PlanSummaryOptions = {}
): PlanSummaryView | null {
  const plan = findPlanById(db, planId);
  if (!plan) return null;

  const nextStep = getNextStepView(db, planId, options);
  if (!nextStep) return null;

  const publicUrl = options.publicUrl ?? "http://127.0.0.1:3001";
  const activeStep = findActiveStepByPlanId(db, planId);
  const blockedSteps = findBlockedStepsByPlanId(db, planId, options.blockedLimit ?? defaultBlockedLimit);
  const recentEvents = findRecentPlanTimelineEvents(db, planId, options.recentEventsLimit ?? defaultRecentEventsLimit);

  return {
    resourceType: "plan_summary",
    uri: planSummaryUri(planId),
    planId: plan.id,
    planUri: planUri(plan.id),
    title: plan.title,
    status: plan.status,
    stepCounts: getStepCounts(db, planId),
    nextUri: planNextUri(planId),
    message: nextStep.message,
    links: userFacingLinks(publicUrl, plan.id),
    plan: {
      id: plan.id,
      uri: planUri(plan.id),
      title: plan.title,
      status: plan.status,
      stepCounts: getStepCounts(db, planId),
      links: userFacingLinks(publicUrl, plan.id)
    },
    activeStep: activeStep ? toStepSummary(activeStep) : null,
    nextAction: nextStep.nextAction,
    blockedSteps: blockedSteps.map(toStepSummary),
    recentEvents: recentEvents.map(toPlanTimelineEvent),
    resources: planResourceLinks(planId)
  };
}
