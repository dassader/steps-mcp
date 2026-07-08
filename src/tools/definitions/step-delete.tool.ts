import { stepDeleteHandler } from "../step-delete.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepDeleteTool: ToolRegistration = {
  name: "step.delete",
  title: "Delete Step",
  description: "Delete a step and related workflow data after explicit confirmation.",
  inputSchema: objectSchema(["stepId", "confirmDeleteRelatedData"], {
    stepId: uuidSchema("Step UUID."),
    confirmDeleteRelatedData: {
      const: true,
      description: "Confirms deletion of the step and related workflow data."
    }
  }),
  handler: stepDeleteHandler
};
