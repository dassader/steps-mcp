import { stepStartNextHandler } from "../step-start-next.js";
import { authorSchema, objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const stepStartNextTool: ToolRegistration = {
  name: "step.start_next",
  title: "Start Next Step",
  description: "Start the server-selected next step by creating a note-backed transition to implementing.",
  inputSchema: objectSchema(["planId", "noteText", "author"], {
    planId: uuidSchema("Plan UUID."),
    noteText: stringFieldSchema("Markdown explanation for starting the selected step."),
    author: authorSchema
  }),
  handler: stepStartNextHandler
};
