import { describe, expect, it } from "vitest";

import {
  approvePlan,
  createMcpContractContext,
  createPlanWithSteps,
  expectJsonRpcSuccess,
  parseJsonResource
} from "../helpers/mcp-contract-client.js";

describe("Concurrent step start transactions", () => {
  it("allows only one concurrent start_next call to create an active step", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Concurrent start", [
        { title: "First", description: "First independent step.", order: 0 },
        { title: "Second", description: "Second independent step.", order: 0 }
      ]);
      await approvePlan(context.client, fixture.planId);

      const responses = await Promise.all([
        context.client.callTool(
          "step.start_next",
          { planId: fixture.planId, noteText: "Agent A starts next.", author: "agent" },
          { idempotencyKey: "concurrent-start-a" }
        ),
        context.client.callTool(
          "step.start_next",
          { planId: fixture.planId, noteText: "Agent B starts next.", author: "agent" },
          { idempotencyKey: "concurrent-start-b" }
        )
      ]);

      const results = responses.map((response) => expectJsonRpcSuccess(response).structuredContent);
      const successes = results.filter((result) => result.ok === true);
      const errors = results.filter((result) => result.ok === false);
      expect(successes).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: "PLAN_HAS_ACTIVE_STEP",
        errorType: "conflict",
        resources: { nextUri: `steps://plans/${fixture.planId}/next` },
        next: expect.any(Object)
      });

      const next = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`));
      expect(next).toMatchObject({
        state: "active_step",
        selectedStep: { id: successes[0].state.stepId }
      });

      const steps = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/steps`));
      const activeSteps = steps.steps.filter((step: Record<string, string>) =>
        step.status === "implementing" || step.status === "verification"
      );
      expect(activeSteps).toHaveLength(1);
    } finally {
      context.close();
    }
  });
});
