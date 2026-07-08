import type { Step } from "../domain/types.js";
import { createPlan, getStepCounts } from "../repositories/plan.repository.js";
import { createStep } from "../repositories/step.repository.js";
import { planResourceLinks, userFacingLinks } from "../resources/uris.js";
import { getNextStepView } from "../services/next-step.service.js";
import type { ToolCallContext } from "./types.js";
import { invalidRequest } from "./tool-error.js";
import type { ToolSuccess } from "./tool-result.js";

interface NewStepInput {
  title: string;
  description: string;
  order: number;
}

export function planCreateWithStepsHandler(args: Record<string, unknown>, context: ToolCallContext): ToolSuccess {
  const title = readPlanTitle(args.title);
  const steps = readSteps(args.steps);
  const created = createPlanAndSteps(context, title, steps);
  const resources = planResourceLinks(created.plan.id);
  const nextStep = getNextStepView(context.db, created.plan.id, { publicUrl: context.publicUrl });

  return {
    ok: true,
    message: "Plan and initial steps were created.",
    changed: {
      plansCreated: 1,
      stepsCreated: created.steps.length
    },
    resources,
    links: userFacingLinks(context.publicUrl, created.plan.id),
    state: {
      planId: created.plan.id,
      planStatus: created.plan.status,
      stepIds: created.steps.map((step) => step.id),
      stepCounts: getStepCounts(context.db, created.plan.id)
    },
    next: {
      recommendedUserAction: "show_plan_review_url",
      reason: "Show links.reviewUrl to the user and wait for explicit approval before starting work."
    },
    ...(nextStep ? { planNextAction: nextStep.nextAction } : {})
  };
}

function createPlanAndSteps(context: ToolCallContext, title: string, steps: NewStepInput[]) {
  const create = context.db.transaction((inputSteps: NewStepInput[]): { plan: ReturnType<typeof createPlan>; steps: Step[] } => {
    const plan = createPlan(context.db, title);
    return {
      plan,
      steps: inputSteps.map((step) => createStep(context.db, plan.id, step.title, step.description, step.order))
    };
  });

  return create(steps);
}

function readPlanTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest("PLAN_TITLE_REQUIRED", "Plan title is required.", {
      field: "title",
      providedValue: value
    });
  }
  return value.trim();
}

function readSteps(value: unknown): NewStepInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest("PLAN_STEPS_REQUIRED", "At least one initial step is required.", {
      field: "steps",
      providedValue: value
    });
  }
  return value.map(readStep);
}

function readStep(value: unknown, index: number): NewStepInput {
  if (!value || typeof value !== "object") {
    throw invalidRequest("STEP_TITLE_REQUIRED", "Step title is required.", {
      field: `steps.${index}`,
      providedValue: value
    });
  }

  const step = value as Record<string, unknown>;
  const title = readStepText(step.title, `steps.${index}.title`, "STEP_TITLE_REQUIRED", "Step title is required.");
  const description = readStepText(
    step.description,
    `steps.${index}.description`,
    "STEP_DESCRIPTION_REQUIRED",
    "Step description is required."
  );
  const order = step.order;
  if (!Number.isInteger(order) || (order as number) < 0) {
    throw invalidRequest("STEP_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", {
      field: `steps.${index}.order`,
      providedValue: order
    });
  }

  return {
    title,
    description,
    order: order as number
  };
}

function readStepText(value: unknown, field: string, code: string, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw invalidRequest(code, message, {
      field,
      providedValue: value
    });
  }
  return value.trim();
}
