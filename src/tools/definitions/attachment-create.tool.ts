import { attachmentCreateHandler } from "../attachment-create.js";
import { objectSchema, stringFieldSchema, uuidSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const attachmentCreateTool: ToolRegistration = {
  name: "attachment.create",
  title: "Create Attachment",
  description: "Create an attachment for a note and return metadata and content resource URIs.",
  inputSchema: objectSchema(["noteId", "name"], {
    noteId: uuidSchema("Note UUID."),
    name: stringFieldSchema("Human-readable file or artifact name."),
    mimeType: {
      type: "string",
      description: "Attachment media type. Required when content.blob is provided."
    },
    content: {
      type: "object",
      maxProperties: 1,
      description: "Optional inline attachment content.",
      properties: {
        text: {
          type: "string",
          description: "Text content for text-like attachments."
        },
        blob: {
          type: "string",
          description: "Base64-encoded binary content."
        },
        linkUri: {
          type: "string",
          description: "External or internal link when the attachment is link-only."
        }
      },
      additionalProperties: false
    }
  }),
  handler: attachmentCreateHandler
};
