import { describe, expect, it } from "vitest";

import { createMcpContractContext, expectJsonRpcSuccess } from "../helpers/mcp-contract-client.js";

const expectedTools = [
  "server.get_started",
  "plan.create",
  "plan.create_with_steps",
  "plan.list",
  "plan.approve",
  "plan.pause",
  "plan.resume",
  "plan.update",
  "plan.reorder_steps",
  "plan.block",
  "plan.unblock",
  "step.create",
  "step.update",
  "step.start_next",
  "step.transition",
  "note.create",
  "attachment.create",
  "attachment.update",
  "plan.delete",
  "step.delete",
  "note.delete",
  "attachment.delete"
];

describe("tools/list discovery contract", () => {
  it("returns every exposed tool with compact AI-facing descriptions and schemas", async () => {
    const context = await createMcpContractContext();
    try {
      const result = expectJsonRpcSuccess(await context.client.listTools());
      const tools = result.tools as Array<Record<string, unknown>>;

      expect(tools.map((tool) => tool.name)).toEqual(expectedTools);
      for (const tool of tools) {
        expect(tool).toMatchObject({
          name: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          inputSchema: expect.objectContaining({ type: "object" })
        });
        expect(String(tool.description).length).toBeLessThanOrEqual(180);
      }
    } finally {
      context.close();
    }
  });
});
