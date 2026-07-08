import { planUpdateHandler } from "../plan-update.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planUpdateTool: ToolRegistration = {
  name: "plan.update",
  title: "Update Plan",
  description: "Update plan metadata and return the updated plan resource URI.",
  inputSchema: objectSchema(["planId", "title"], {
    planId: uuidSchema("Plan UUID."),
    title: stringFieldSchema("New plan title.")
  }),
  handler: planUpdateHandler
};
