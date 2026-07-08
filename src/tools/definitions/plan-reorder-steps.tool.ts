import { planReorderStepsHandler } from "../plan-reorder.js";
import { objectSchema, orderFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planReorderStepsTool: ToolRegistration = {
  name: "plan.reorder_steps",
  title: "Reorder Plan Steps",
  description: "Reorder all steps in a draft or approved plan and return updated plan resource URIs.",
  inputSchema: objectSchema(["planId", "stepOrders"], {
    planId: uuidSchema("Plan UUID."),
    stepOrders: {
      type: "array",
      minItems: 1,
      description: "Complete desired step order for the plan.",
      items: objectSchema(["stepId", "order"], {
        stepId: uuidSchema("Step UUID that belongs to the plan."),
        order: orderFieldSchema
      })
    }
  }),
  handler: planReorderStepsHandler
};
