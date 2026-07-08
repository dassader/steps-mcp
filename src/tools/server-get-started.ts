import { readDocumentationResource } from "../resources/documentation.js";
import { listPrompts } from "../prompts/list-handler.js";
import type { ToolSuccess } from "./tool-result.js";

const overviewUri = "steps://docs/overview";

export function serverGetStartedHandler(): ToolSuccess {
  const overview = readDocumentationResource(overviewUri);
  const prompts = listPrompts();

  return {
    ok: true,
    message: "Steps MCP getting-started guidance was returned.",
    changed: {},
    resources: {
      overviewUri
    },
    state: {
      overview: overview?.text ?? null,
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        title: prompt.title,
        description: prompt.description
      })),
      firstWorkflow: [
        "Read steps://docs/overview.",
        "Use prompt plan.break_down for new work.",
        "Create a reviewable plan with plan.create_with_steps.",
        "Show links.reviewUrl and wait for explicit approval.",
        "After approval, follow steps://plans/{planId}/next."
      ]
    },
    next: {
      recommendedPrompt: "plan.break_down",
      recommendedResource: overviewUri,
      reason: "Use the overview and planning prompt before creating new work."
    }
  };
}

