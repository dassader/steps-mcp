import { describe, expect, it } from "vitest";

import {
  createMcpContractContext,
  createNote,
  createPlanWithSteps,
  expectJsonRpcProtocolError,
  expectJsonRpcSuccess
} from "../helpers/mcp-contract-client.js";

describe("attachment content variants", () => {
  it("reads binary blob content and reports unavailable content for link-only attachments", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Attachment variants");
      const note = await createNote(context.client, fixture.stepIds[0], "Attachment parent note.");

      const blob = Buffer.from("binary evidence").toString("base64");
      const binaryCreated = expectJsonRpcSuccess(
        await context.client.callTool("attachment.create", {
          noteId: note.state.noteId,
          name: "evidence.bin",
          mimeType: "application/octet-stream",
          content: { blob }
        })
      ).structuredContent;
      const binaryContent = expectJsonRpcSuccess(
        await context.client.readResource(`steps://attachments/${binaryCreated.state.attachmentId}/content`)
      );
      expect(binaryContent.contents[0]).toMatchObject({
        uri: `steps://attachments/${binaryCreated.state.attachmentId}/content`,
        mimeType: "application/octet-stream",
        blob
      });

      const linkCreated = expectJsonRpcSuccess(
        await context.client.callTool("attachment.create", {
          noteId: note.state.noteId,
          name: "external-log",
          content: { linkUri: "https://example.test/logs/1" }
        })
      ).structuredContent;
      const unavailable = expectJsonRpcProtocolError(
        await context.client.readResource(`steps://attachments/${linkCreated.state.attachmentId}/content`),
        -32000
      );
      expect(unavailable.data).toMatchObject({
        ok: false,
        errorType: "state_error",
        code: "ATTACHMENT_CONTENT_UNAVAILABLE",
        details: { contentKind: "link", linkUri: "https://example.test/logs/1" }
      });
    } finally {
      context.close();
    }
  });
});
