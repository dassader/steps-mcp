import { attachmentUpdateHandler } from "../attachment-update.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const attachmentUpdateTool: ToolRegistration = {
  name: "attachment.update",
  title: "Update Attachment",
  description: "Update attachment metadata and return the updated attachment resource URI.",
  inputSchema: objectSchema(["attachmentId"], {
    attachmentId: uuidSchema("Attachment UUID."),
    name: stringFieldSchema("New human-readable file or artifact name."),
    mimeType: {
      type: "string",
      description: "New media type."
    }
  }),
  handler: attachmentUpdateHandler
};
