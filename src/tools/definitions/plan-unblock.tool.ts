import { planUnblockHandler } from "../plan-lifecycle.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planUnblockTool: ToolRegistration = {
  name: "plan.unblock",
  title: "Unblock Plan",
  description: "Clear a plan-level blocker and return the next-step resource URI.",
  inputSchema: objectSchema(["planId"], {
    planId: uuidSchema("Plan UUID.")
  }),
  handler: planUnblockHandler
};
