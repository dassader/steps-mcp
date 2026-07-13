import { planListHandler } from "../plan-list.js";
import { objectSchema, planStatusSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planListTool: ToolRegistration = {
  name: "plan.list",
  title: "List Plans",
  description: "List recent accessible plans with optional status, title/id, and active-step filtering.",
  inputSchema: objectSchema([], {
    status: planStatusSchema,
    query: {
      type: "string",
      description: "Optional case-insensitive substring match on plan title, or exact plan UUID."
    },
    hasActiveStep: {
      type: "boolean",
      description: "Optional filter for plans that currently have a step in implementing or verification."
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 20,
      description: "Maximum number of plan summaries to return."
    },
    cursor: {
      type: "string",
      description: "Opaque cursor from a previous plan.list response."
    }
  }),
  handler: planListHandler
};
