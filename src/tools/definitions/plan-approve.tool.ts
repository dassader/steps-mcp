import { planApproveHandler } from "../plan-approve.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planApproveTool: ToolRegistration = {
  name: "plan.approve",
  title: "Approve Plan",
  description: "Record explicit user approval for a reviewed draft plan.",
  inputSchema: objectSchema(["planId", "approvalEvidence"], {
    planId: uuidSchema("Plan UUID."),
    approvalEvidence: stringFieldSchema("Short text describing the user's explicit approval or trusted UI approval event.")
  }),
  handler: planApproveHandler
};
