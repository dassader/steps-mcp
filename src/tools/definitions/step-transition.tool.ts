import { stepTransitionHandler } from "../step-transition.js";
import { authorSchema, objectSchema, stepStatusSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepTransitionTool: ToolRegistration = {
  name: "step.transition",
  title: "Transition Step",
  description: "Change a step status by creating a note-backed transition.",
  inputSchema: objectSchema(["stepId", "fromStatus", "toStatus", "noteText", "author"], {
    stepId: uuidSchema("Step UUID."),
    fromStatus: {
      ...stepStatusSchema,
      description: "Status the agent believes the step currently has."
    },
    toStatus: {
      ...stepStatusSchema,
      description: "Requested new status."
    },
    noteText: stringFieldSchema("Markdown explanation for why the status is changing."),
    author: authorSchema
  }),
  handler: stepTransitionHandler
};
