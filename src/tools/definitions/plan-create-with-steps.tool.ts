import { planCreateWithStepsHandler } from "../plan-create-with-steps.js";
import { stepDescriptionFormatInstruction } from "../../domain/step-description-format.js";
import { objectSchema, orderFieldSchema, stringFieldSchema } from "./schema.js";
import type { JsonSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

const newStepInput: JsonSchema = {
  type: "object",
  required: ["title", "description", "order"],
  properties: {
    title: stringFieldSchema("Short step title."),
    description: stringFieldSchema(stepDescriptionFormatInstruction),
    order: orderFieldSchema
  },
  additionalProperties: false
};

export const planCreateWithStepsTool: ToolRegistration = {
  name: "plan.create_with_steps",
  title: "Create Plan With Steps",
  description: "Create a work plan with detailed formatted todo steps and return resource URIs and review URL.",
  inputSchema: objectSchema(["title", "steps"], {
    title: stringFieldSchema("Short title for the work plan."),
    steps: {
      type: "array",
      minItems: 1,
      description: "Initial todo steps; each description must follow the required Step markdown format.",
      items: newStepInput
    }
  }),
  handler: planCreateWithStepsHandler
};
