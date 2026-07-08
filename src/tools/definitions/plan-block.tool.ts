import { planBlockHandler } from "../plan-lifecycle.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planBlockTool: ToolRegistration = {
  name: "plan.block",
  title: "Block Plan",
  description: "Mark a plan blocked when execution cannot continue at plan level.",
  inputSchema: objectSchema(["planId", "reason"], {
    planId: uuidSchema("Plan UUID."),
    reason: stringFieldSchema("Short explanation of the plan-level blocker.")
  }),
  handler: planBlockHandler
};
