import { planCreateWithStepsHandler } from "../plan-create-with-steps.js";
import { objectSchema, orderFieldSchema, stringFieldSchema } from "./schema.js";
import type { JsonSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

const newStepInput: JsonSchema = {
  type: "object",
  required: ["title", "description", "order"],
  properties: {
    title: stringFieldSchema("Short step title."),
    description: stringFieldSchema(
      "Detailed markdown instructions explaining what to do, why, expected result, important constraints, and how to verify the result."
    ),
    order: orderFieldSchema
  },
  additionalProperties: false
};

export const planCreateWithStepsTool: ToolRegistration = {
  name: "plan.create_with_steps",
  title: "Create Plan With Steps",
  description: "Create a work plan with detailed markdown todo steps and return resource URIs and review URL.",
  inputSchema: objectSchema(["title", "steps"], {
    title: stringFieldSchema("Short title for the work plan."),
    steps: {
      type: "array",
      minItems: 1,
      description: "Initial detailed markdown todo steps for the plan.",
      items: newStepInput
    }
  }),
  handler: planCreateWithStepsHandler
};
