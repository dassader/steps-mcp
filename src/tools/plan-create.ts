import type { ToolCallContext } from "./types.js";
import { getNextStepView } from "../services/next-step.service.js";
import { createPlan, getStepCounts } from "../repositories/plan.repository.js";
import { planResourceLinks, userFacingLinks } from "../resources/uris.js";
import { invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

export function planCreateHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const title = readTitle(args.title);
  const plan = createPlan(context.db, title);
  const resources = planResourceLinks(plan.id);
  const nextStep = getNextStepView(context.db, plan.id, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Plan was created.",
    changed: {
      plansCreated: 1,
      stepsCreated: 0
    },
    resources,
    links: userFacingLinks(context.publicUrl, plan.id),
    state: {
      planId: plan.id,
      title: plan.title,
      planStatus: plan.status,
      stepCounts: getStepCounts(context.db, plan.id)
    },
    next: {
      recommendedTool: "step.create",
      reason: "Create steps inside the draft plan, then show links.reviewUrl to the user before execution begins."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
}

function readTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("PLAN_TITLE_REQUIRED", "Plan title is required.", {
      field: "title",
      providedValue: value
    });
  }
  return value.trim();
}
