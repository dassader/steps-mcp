import { planPauseHandler } from "../plan-lifecycle.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planPauseTool: ToolRegistration = {
  name: "plan.pause",
  title: "Pause Plan",
  description: "Pause an executing plan and return its current plan resource URI.",
  inputSchema: objectSchema(["planId", "reason"], {
    planId: uuidSchema("Plan UUID."),
    reason: stringFieldSchema("Short explanation for pausing execution.")
  }),
  handler: planPauseHandler
};
