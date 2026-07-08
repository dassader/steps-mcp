import { describe, expect, it } from "vitest";

import {
  approvePlan,
  createAttachment,
  createMcpContractContext,
  createNote,
  createPlanWithSteps,
  expectJsonRpcProtocolError,
  parseJsonResource,
  startNextStep,
  transitionStep
} from "../helpers/mcp-contract-client.js";

describe("Pagination over runtime MCP views", () => {
  it("paginates plan timeline resources with opaque cursors", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Timeline pagination", [
        { title: "Only step", description: "Create enough events to paginate.", order: 1 }
      ]);
      await approvePlan(context.client, fixture.planId);
      const started = await startNextStep(context.client, fixture.planId);
      await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
      const note = await createNote(context.client, String(started.state.stepId), "Extra pagination evidence.");
      await createAttachment(context.client, String(note.state.noteId), "pagination.txt");

      const firstPage = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/timeline?limit=2`));
      expect(firstPage.page).toMatchObject({ limit: 2, hasMore: true, nextCursor: expect.any(String) });
      expect(firstPage.events).toHaveLength(2);

      const secondPage = parseJsonResource(
        await context.client.readResource(
          `steps://plans/${fixture.planId}/timeline?limit=2&cursor=${encodeURIComponent(firstPage.page.nextCursor)}`
        )
      );
      expect(secondPage.page.limit).toBe(2);
      expect(secondPage.events.length).toBeGreaterThan(0);

      const firstIds = new Set(firstPage.events.map((event: Record<string, string>) => event.id));
      expect(secondPage.events.some((event: Record<string, string>) => firstIds.has(event.id))).toBe(false);

      const invalidCursor = expectJsonRpcProtocolError(
        await context.client.readResource(`steps://plans/${fixture.planId}/timeline?cursor=not-a-cursor`),
        -32602
      );
      expect(invalidCursor.data.code).toBe("INVALID_TIMELINE_CURSOR");
    } finally {
      context.close();
    }
  });
});
