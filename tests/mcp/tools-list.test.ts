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

  it("publishes the required Step description format in creation schemas", async () => {
    const context = await createMcpContractContext();
    try {
      const result = expectJsonRpcSuccess(await context.client.listTools());
      const tools = result.tools as Array<Record<string, unknown>>;
      const stepCreate = requireTool(tools, "step.create");
      const planCreateWithSteps = requireTool(tools, "plan.create_with_steps");
      const stepDescription = propertyDescription(stepCreate.inputSchema, ["description"]);
      const nestedStepDescription = propertyDescription(planCreateWithSteps.inputSchema, ["steps", "items", "description"]);

      expect(stepDescription).toContain("Keep headings, subheadings, checklist markers, and user-story labels in English.");
      expect(stepDescription).toContain("Write the filled-in content in the language used with the user.");
      expect(stepDescription).toContain("## Summary");
      expect(stepDescription).toContain("## Acceptance criteria");
      expect(stepDescription).toContain("### Cleanup / Finalization");
      expect(nestedStepDescription).toBe(stepDescription);
    } finally {
      context.close();
    }
  });
});

function requireTool(tools: Array<Record<string, unknown>>, name: string): Record<string, unknown> {
  const tool = tools.find((candidate) => candidate.name === name);
  expect(tool).toBeDefined();
  return tool as Record<string, unknown>;
}

function propertyDescription(schema: unknown, path: string[]): string {
  let current = schema as Record<string, unknown>;

  for (const segment of path) {
    if (segment === "items") {
      current = current.items as Record<string, unknown>;
      continue;
    }

    const properties = current.properties as Record<string, unknown>;
    current = properties[segment] as Record<string, unknown>;
  }

  return String(current.description);
}
