import { attachmentDeleteHandler } from "../attachment-delete.js";
import { objectSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const attachmentDeleteTool: ToolRegistration = {
  name: "attachment.delete",
  title: "Delete Attachment",
  description: "Delete an attachment and stored content after explicit confirmation.",
  inputSchema: objectSchema(["attachmentId", "confirmDeleteContent"], {
    attachmentId: uuidSchema("Attachment UUID."),
    confirmDeleteContent: {
      const: true,
      description: "Confirms deletion of the attachment and stored content."
    }
  }),
  handler: attachmentDeleteHandler
};
