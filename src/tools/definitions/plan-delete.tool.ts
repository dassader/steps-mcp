import { planDeleteHandler } from "../plan-delete.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planDeleteTool: ToolRegistration = {
  name: "plan.delete",
  title: "Delete Plan",
  description: "Delete a plan and its contained workflow data after explicit confirmation.",
  inputSchema: objectSchema(["planId", "confirmDeleteContainedData"], {
    planId: uuidSchema("Plan UUID."),
    confirmDeleteContainedData: {
      const: true,
      description: "Confirms deletion of the plan and contained workflow data."
    }
  }),
  handler: planDeleteHandler
};
