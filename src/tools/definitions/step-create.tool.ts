import { stepCreateHandler } from "../step-create.js";
import { stepDescriptionFormatInstruction } from "../../domain/step-description-format.js";
import { objectSchema, orderFieldSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepCreateTool: ToolRegistration = {
  name: "step.create",
  title: "Create Step",
  description: "Create a todo step inside a plan using the required markdown description format and return its resource URI.",
  inputSchema: objectSchema(["planId", "title", "description", "order"], {
    planId: uuidSchema("Parent plan UUID."),
    title: stringFieldSchema("Short step title."),
    description: stringFieldSchema(stepDescriptionFormatInstruction),
    order: orderFieldSchema
  }),
  handler: stepCreateHandler
};
