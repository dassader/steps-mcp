import { describe, expect, it } from "vitest";

import {
  approvePlan,
  createMcpContractContext,
  createPlanWithSteps,
  expectToolError,
  expectToolSuccess,
  parseJsonResource,
  startNextStep,
  transitionStep
} from "../helpers/mcp-contract-client.js";

describe("state machine edge cases", () => {
  it("returns precise start_next errors for paused, blocked, completed, and ordered-blocked plans", async () => {
    const context = await createMcpContractContext();
    try {
      const paused = await createPlanWithSteps(context.client, "Paused start");
      await approvePlan(context.client, paused.planId);
      await startNextStep(context.client, paused.planId);
      expectToolSuccess(await context.client.callTool("plan.pause", { planId: paused.planId, reason: "Pause edge case." }));
      expectToolError(
        await context.client.callTool("step.start_next", { planId: paused.planId, noteText: "Start", author: "agent" }),
        "PLAN_PAUSED",
        "state_error"
      );

      const blocked = await createPlanWithSteps(context.client, "Blocked start");
      await approvePlan(context.client, blocked.planId);
      expectToolSuccess(await context.client.callTool("plan.block", { planId: blocked.planId, reason: "Blocked edge case." }));
      expectToolError(
        await context.client.callTool("step.start_next", { planId: blocked.planId, noteText: "Start", author: "agent" }),
        "PLAN_BLOCKED",
        "state_error"
      );

      const completed = await createPlanWithSteps(context.client, "Completed start", [
        { title: "Only", description: "Only step.", order: 1 }
      ]);
      await approvePlan(context.client, completed.planId);
      const started = await startNextStep(context.client, completed.planId);
      await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
      await transitionStep(context.client, String(started.state.stepId), "verification", "done");
      expectToolError(
        await context.client.callTool("step.start_next", { planId: completed.planId, noteText: "Start", author: "agent" }),
        "PLAN_ALREADY_COMPLETED",
        "state_error"
      );

      const ordered = await createPlanWithSteps(context.client, "Ordered start", [
        { title: "First", description: "First ordered.", order: 1 },
        { title: "Second", description: "Second ordered.", order: 2 }
      ]);
      await approvePlan(context.client, ordered.planId);
      const orderedStarted = await startNextStep(context.client, ordered.planId);
      await transitionStep(context.client, String(orderedStarted.state.stepId), "implementing", "blocked");
      expectToolError(
        await context.client.callTool("step.start_next", { planId: ordered.planId, noteText: "Start", author: "agent" }),
        "PLAN_NEXT_ORDERED_CHAIN_BLOCKED",
        "state_error"
      );
    } finally {
      context.close();
    }
  });

  it("reopens a completed plan and blocks implementation transitions while paused", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Reopen completed", [
        { title: "Only", description: "Only step.", order: 1 }
      ]);
      await approvePlan(context.client, fixture.planId);
      const started = await startNextStep(context.client, fixture.planId);
      await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
      await transitionStep(context.client, String(started.state.stepId), "verification", "done");

      const returned = await transitionStep(context.client, String(started.state.stepId), "done", "todo");
      expect(returned.state).toMatchObject({ planStatus: "executing", previousStatus: "done", status: "todo" });
      const reopened = await transitionStep(context.client, String(started.state.stepId), "todo", "implementing");
      expect(reopened.state).toMatchObject({ planStatus: "executing", previousStatus: "todo", status: "implementing" });

      expectToolSuccess(await context.client.callTool("plan.pause", { planId: fixture.planId, reason: "Pause before rework." }));
      expectToolSuccess(
        await context.client.callTool("step.transition", {
          stepId: started.state.stepId,
          fromStatus: "implementing",
          toStatus: "blocked",
          noteText: "Blocked while paused.",
          author: "agent"
        })
      );
      expectToolError(
        await context.client.callTool("step.transition", {
          stepId: started.state.stepId,
          fromStatus: "blocked",
          toStatus: "implementing",
          noteText: "Try to continue while paused.",
          author: "agent"
        }),
        "PLAN_PAUSED",
        "state_error"
      );

      const next = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`));
      expect(next.state).toBe("plan_paused");
    } finally {
      context.close();
    }
  });
});
