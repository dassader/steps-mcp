import type { Plan, PlanStatus } from "../domain/types.js";
import { getStepCounts, listPlans } from "../repositories/plan.repository.js";
import { planNextUri, planSummaryUri, planTimelineUri, planUri, userFacingLinks } from "../resources/uris.js";
import { InvalidCursorError } from "../utils/pagination.js";
import type { ToolCallContext } from "./types.js";
import { invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

const planStatuses = new Set<PlanStatus>(["draft", "approved", "executing", "paused", "completed", "blocked"]);

export function planListHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const filters = readFilters(args);
  const result = readPlans(context, filters);
  const summaries = result.plans.map((plan) => toPlanSummary(context, plan));

  return {
    ok: true,
    message: "Plans were listed.",
    changed: {},
    resources: {},
    state: {
      plans: summaries,
      page: result.page
    },
    page: result.page,
    next:
      summaries.length > 0
        ? {
            recommendedResource: summaries[0].uri,
            reason: "Read the selected plan before continuing work."
          }
        : {
            none: true,
            reason: "No matching plans were found."
          }
  };
}

function readPlans(context: ToolCallContext, filters: ReturnType<typeof readFilters>) {
  try {
    return listPlans(context.db, filters);
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw invalidRequest("PLAN_LIST_CURSOR_INVALID", "Plan list cursor is invalid.", {
        field: "cursor",
        providedValue: filters.cursor
      });
    }
    throw error;
  }
}

function readFilters(args: Record<string, unknown>) {
  return {
    status: readStatus(args.status),
    query: typeof args.query === "string" ? args.query : undefined,
    hasActiveStep: typeof args.hasActiveStep === "boolean" ? args.hasActiveStep : undefined,
    limit: typeof args.limit === "number" ? args.limit : undefined,
    cursor: typeof args.cursor === "string" ? args.cursor : undefined
  };
}

function readStatus(value: unknown): PlanStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && planStatuses.has(value as PlanStatus)) {
    return value as PlanStatus;
  }
  throw invalidRequest("PLAN_STATUS_INVALID", "Plan status filter is invalid.", {
    field: "status",
    providedValue: value,
    allowedValues: [...planStatuses]
  });
}

function toPlanSummary(context: ToolCallContext, plan: Plan) {
  return {
    id: plan.id,
    uri: planUri(plan.id),
    title: plan.title,
    status: plan.status,
    blockerReason: plan.blockerReason,
    stepCounts: getStepCounts(context.db, plan.id),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    nextUri: planNextUri(plan.id),
    summaryUri: planSummaryUri(plan.id),
    timelineUri: planTimelineUri(plan.id),
    links: userFacingLinks(context.publicUrl, plan.id)
  };
}
