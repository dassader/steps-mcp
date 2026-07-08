import { planResumeHandler } from "../plan-lifecycle.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planResumeTool: ToolRegistration = {
  name: "plan.resume",
  title: "Resume Plan",
  description: "Resume a paused plan and return its next-step resource URI.",
  inputSchema: objectSchema(["planId"], {
    planId: uuidSchema("Plan UUID.")
  }),
  handler: planResumeHandler
};
