import { stepCreateHandler } from "../step-create.js";
import { objectSchema, orderFieldSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepCreateTool: ToolRegistration = {
  name: "step.create",
  title: "Create Step",
  description: "Create a todo step inside a plan and return its step resource URI.",
  inputSchema: objectSchema(["planId", "title", "description", "order"], {
    planId: uuidSchema("Parent plan UUID."),
    title: stringFieldSchema("Short step title."),
    description: stringFieldSchema("Markdown instructions explaining what to do, why, expected result, and important constraints."),
    order: orderFieldSchema
  }),
  handler: stepCreateHandler
};
