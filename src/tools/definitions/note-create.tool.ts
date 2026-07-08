import { noteCreateHandler } from "../note-create.js";
import { authorSchema, objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const noteCreateTool: ToolRegistration = {
  name: "note.create",
  title: "Create Note",
  description: "Create a note for a step without changing step status.",
  inputSchema: objectSchema(["stepId", "text", "author"], {
    stepId: uuidSchema("Step UUID."),
    text: stringFieldSchema("Markdown note text."),
    author: authorSchema
  }),
  handler: noteCreateHandler
};
