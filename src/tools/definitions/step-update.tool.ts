import { stepUpdateHandler } from "../step-update.js";
import { objectSchema, orderFieldSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepUpdateTool: ToolRegistration = {
  name: "step.update",
  title: "Update Step",
  description: "Update editable step fields; use step.transition for status changes.",
  inputSchema: objectSchema(["stepId"], {
    stepId: uuidSchema("Step UUID."),
    title: stringFieldSchema("New step title."),
    description: stringFieldSchema("New markdown step description."),
    order: orderFieldSchema
  }),
  handler: stepUpdateHandler
};
