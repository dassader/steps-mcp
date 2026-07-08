import { noteDeleteHandler } from "../note-delete.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const noteDeleteTool: ToolRegistration = {
  name: "note.delete",
  title: "Delete Note",
  description: "Delete a note only when it is not required by a transition.",
  inputSchema: objectSchema(["noteId", "confirmDeleteAttachments"], {
    noteId: uuidSchema("Note UUID."),
    confirmDeleteAttachments: {
      type: "boolean",
      description: "Confirms deletion of the note attachments."
    }
  }),
  handler: noteDeleteHandler
};
