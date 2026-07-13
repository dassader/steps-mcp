import { stepDescriptionFormatInstruction } from "../../domain/step-description-format.js";

export function planBreakDownMessage(args: Record<string, string>): string {
  return `Use Steps MCP to break down the following goal into a reviewable plan and detailed initial steps.

Goal:
${args.goal}

Constraints:
${args.constraints || "None provided."}

Create a concise plan title. Create detailed markdown step descriptions that explain what to do, why it matters, expected result, important constraints, and how to verify the result.

${stepDescriptionFormatInstruction}

Use order = 0 for independent steps that can run in any order. Use order > 0 only for strict sequence dependencies. Prefer plan.create_with_steps so the plan and initial steps are created atomically. After creation, copy links.reviewUrl exactly from the tool response, show it to the user, and wait for explicit approval. Do not call plan.approve or start execution until the user approves the reviewed plan. Optional deeper docs: steps://docs/flows/planning, steps://docs/flows/order, steps://docs/flows/review.`;
}
