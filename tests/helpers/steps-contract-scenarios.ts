import { expect } from "vitest";

import {
  approvePlan,
  createAttachment,
  createMcpContractContext,
  createNote,
  createPlanWithSteps,
  expectJsonRpcProtocolError,
  expectJsonRpcSuccess,
  expectMarkdownResource,
  expectPlanNextAction,
  expectResourceNotFound,
  expectToolError,
  expectToolSuccess,
  parseJsonResource,
  startNextStep,
  transitionStep,
  type McpContractContext
} from "./mcp-contract-client.js";

export type ScenarioId =
  | "001"
  | "002"
  | "003"
  | "004"
  | "005"
  | "006"
  | "007"
  | "008"
  | "009"
  | "010"
  | "011"
  | "012"
  | "013"
  | "014"
  | "015"
  | "016"
  | "017"
  | "018"
  | "019"
  | "020"
  | "021"
  | "022"
  | "023"
  | "024"
  | "025"
  | "026"
  | "027"
  | "028"
  | "029"
  | "030"
  | "031"
  | "032"
  | "033"
  | "034"
  | "035"
  | "036"
  | "037"
  | "038"
  | "039"
  | "040"
  | "041"
  | "042"
  | "043"
  | "044"
  | "045"
  | "046"
  | "047"
  | "048"
  | "049"
  | "050"
  | "051"
  | "052"
  | "053"
  | "054"
  | "055"
  | "056";

const docUris = [
  "steps://docs/overview",
  "steps://docs/concepts/plan",
  "steps://docs/concepts/step",
  "steps://docs/concepts/note",
  "steps://docs/concepts/transition",
  "steps://docs/concepts/attachment",
  "steps://docs/flows/execution",
  "steps://docs/flows/planning",
  "steps://docs/flows/review",
  "steps://docs/flows/run",
  "steps://docs/flows/status",
  "steps://docs/flows/blocking",
  "steps://docs/flows/verification",
  "steps://docs/flows/order",
  "steps://docs/flows/next"
];

const templateNames = [
  "steps.plans.detail",
  "steps.plans.steps",
  "steps.plans.next",
  "steps.plans.summary",
  "steps.plans.timeline",
  "steps.steps.detail",
  "steps.steps.history",
  "steps.steps.notes",
  "steps.steps.transitions",
  "steps.steps.attachments",
  "steps.notes.detail",
  "steps.notes.attachments",
  "steps.attachments.detail",
  "steps.attachments.content"
];

const promptNames = [
  "plan.break_down",
  "plan.execute",
  "plan.continue",
  "session.recover",
  "step.verify",
  "step.explain_blocker",
  "step.summarize_history",
  "transition.prepare_note"
];

async function withContext(fn: (context: McpContractContext) => Promise<void>, autoInitialize = true) {
  const context = await createMcpContractContext({ autoInitialize });
  try {
    await fn(context);
  } finally {
    context.close();
  }
}

function expectUuid(value: unknown) {
  expect(value).toEqual(expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function expectPlanResourceUris(resources: Record<string, unknown>, planId: string) {
  expect(resources.planUri).toBe(`steps://plans/${planId}`);
  expect(resources.stepsUri).toBe(`steps://plans/${planId}/steps`);
  expect(resources.nextUri).toBe(`steps://plans/${planId}/next`);
  expect(resources.summaryUri).toBe(`steps://plans/${planId}/summary`);
  expect(resources.timelineUri).toBe(`steps://plans/${planId}/timeline`);
}

async function createApprovedPlan(
  context: McpContractContext,
  title = "Approved Plan",
  steps?: Array<{ title: string; description: string; order: number }>
) {
  const fixture = await createPlanWithSteps(context.client, title, steps);
  await approvePlan(context.client, fixture.planId);
  return fixture;
}

async function createActiveStep(context: McpContractContext) {
  const fixture = await createApprovedPlan(context, "Active Plan");
  const started = await startNextStep(context.client, fixture.planId);
  return { ...fixture, activeStepId: String(started.state.stepId), started };
}

async function createNoteWithAttachment(context: McpContractContext) {
  const fixture = await createActiveStep(context);
  const note = await createNote(context.client, fixture.activeStepId);
  const attachment = await createAttachment(context.client, String(note.state.noteId));
  return { ...fixture, noteId: String(note.state.noteId), attachmentId: String(attachment.state.attachmentId) };
}

function assertToolContract(structured: Record<string, unknown>) {
  expect(structured).toMatchObject({
    ok: true,
    message: expect.any(String),
    changed: expect.any(Object),
    resources: expect.any(Object),
    state: expect.any(Object),
    next: expect.any(Object)
  });
  for (const value of Object.values(structured.changed as Record<string, unknown>)) {
    if (typeof value === "number") {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  }
}

export async function runScenario(id: ScenarioId): Promise<void> {
  switch (id) {
    case "001":
      return withContext(async ({ client }) => {
        const response = await client.health({ Accept: "application/json" });
        expect(response.status).toBe(200);
        expect(response.type).toMatch(/json/);
        expect(response.body.name).toBe("steps-mcp");
        expect(response.body.status === "ok" || response.body.ok === true).toBe(true);
        expect(JSON.stringify(response.body)).not.toContain("stack");
      });

    case "002":
      return withContext(async ({ client }) => {
        client.setSessionId(undefined);
        const initialize = await client.rpc(
          "initialize",
          {
            protocolVersion: "2025-11-25",
            clientInfo: { name: "test-client" },
            capabilities: {}
          },
          { useSession: false }
        );
        const result = expectJsonRpcSuccess(initialize);
        expect(result.protocolVersion).toBe("2025-11-25");
        expect(result.serverInfo).toMatchObject({
          name: "steps-mcp",
          title: expect.any(String)
        });
        expect(result.serverInfo.description ?? "").not.toBe("");
        expect(result.capabilities.tools).toBeDefined();
        expect(result.capabilities.resources).toBeDefined();
        expect(result.capabilities.prompts).toBeDefined();
        expect(result.capabilities.completions).toBeDefined();
        if (result.capabilities.resources.subscribe !== undefined) {
          expect(result.capabilities.resources.subscribe).toBe(false);
        }
        expect(result.instructions).toEqual(expect.stringContaining("steps://docs/overview"));
        expect(initialize.headers["mcp-session-id"]).toBeDefined();

        const initialized = await client.notify("notifications/initialized");
        expect([200, 202, 204]).toContain(initialized.status);
      }, false);

    case "003":
      return withContext(async ({ client }) => {
        const beforeInitialize = await client.rpc("tools/list", {}, { useSession: false });
        expectJsonRpcSuccess(beforeInitialize);
        expect(beforeInitialize.headers["mcp-session-id"]).toBeDefined();

        const initialize = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "test-client" }, capabilities: {} },
          { useSession: false }
        );
        expectJsonRpcSuccess(initialize);
        const beforeInitializedNotification = await client.readResource("steps://docs/overview");
        expectJsonRpcProtocolError(beforeInitializedNotification, -32002);

        await client.notify("notifications/initialized");
        expectJsonRpcSuccess(await client.listTools());
      }, false);

    case "004":
      return withContext(async ({ client }) => {
        const result = expectJsonRpcSuccess(await client.listResources());
        const resources = result.resources as Array<Record<string, string>>;
        expect(resources.map((resource) => resource.uri)).toEqual(expect.arrayContaining(docUris));
        for (const resource of resources) {
          expect(resource).toEqual(
            expect.objectContaining({
              uri: expect.any(String),
              name: expect.any(String),
              title: expect.any(String),
              description: expect.any(String),
              mimeType: "text/markdown"
            })
          );
          expect(resource.uri).not.toMatch(/plans\/[0-9a-f-]+|steps\/[0-9a-f-]+/);
        }
      });

    case "005":
      return withContext(async ({ client }) => {
        const result = expectJsonRpcSuccess(await client.listResourceTemplates());
        const templates = result.resourceTemplates as Array<Record<string, string>>;
        expect(templates.map((template) => template.name)).toEqual(expect.arrayContaining(templateNames));
        for (const template of templates) {
          expect(template).toEqual(
            expect.objectContaining({
              name: expect.any(String),
              uriTemplate: expect.stringContaining("{"),
              title: expect.any(String),
              description: expect.any(String),
              mimeType: expect.any(String)
            })
          );
        }
      });

    case "006":
      return withContext(async ({ client }) => {
        for (const uri of ["steps://docs/overview", "steps://docs/concepts/plan", "steps://docs/flows/execution"]) {
          const markdown = expectMarkdownResource(await client.readResource(uri), uri);
          expect(markdown).toMatch(/^#/);
          expect(markdown).toMatch(/[A-Za-z]/);
        }
        const blocking = expectMarkdownResource(await client.readResource("steps://docs/flows/blocking"), "steps://docs/flows/blocking");
        expect(blocking).toContain("Docker verification is required");
        expect(blocking).toContain("violating an explicit user instruction");
        expect(blocking).toContain("claiming verification that was not actually performed");
        expectResourceNotFound(await client.readResource("steps://docs/non-existent"), "RESOURCE_NOT_FOUND");
      });

    case "007":
      return withContext(async (context) => {
        const { planId } = await createPlanWithSteps(context.client);
        const plan = parseJsonResource(await context.client.readResource(`steps://plans/${planId}`));
        expect(plan).toMatchObject({
          resourceType: "plan",
          id: planId,
          uri: `steps://plans/${planId}`,
          status: "draft",
          links: { reviewUrl: expect.stringContaining(`/plans/${planId}`) },
          resources: expect.any(Object),
          stepCounts: expect.objectContaining({ total: 2 })
        });
        expectPlanResourceUris(plan.resources, planId);
        expect(plan.planNextAction).toMatchObject({ kind: "stop", shouldContinueRun: false });
      });

    case "008":
      return withContext(async (context) => {
        const { planId, stepIds } = await createPlanWithSteps(context.client);
        const view = parseJsonResource(await context.client.readResource(`steps://plans/${planId}/steps`));
        expect(view).toMatchObject({ resourceType: "plan_steps", planId, planUri: `steps://plans/${planId}` });
        expect(view.steps.map((step: Record<string, string>) => step.id)).toEqual(expect.arrayContaining(stepIds));
        for (const step of view.steps) {
          expect(step).toMatchObject({
            uri: expect.stringContaining("steps://steps/"),
            title: expect.any(String),
            description: expect.any(String),
            status: "todo",
            historyUri: expect.any(String),
            notesUri: expect.any(String),
            transitionsUri: expect.any(String),
            attachmentsUri: expect.any(String)
          });
        }
      });

    case "009":
      return withContext(async (context) => {
        const draft = await createPlanWithSteps(context.client, "Draft Next");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${draft.planId}/next`))).toMatchObject({
          resourceType: "plan_next_step",
          state: "plan_not_approved",
          planStatus: "draft",
          nextAction: { kind: "stop", shouldContinueRun: false, requiresUserInput: true }
        });

        const approved = await createApprovedPlan(context, "Approved Next");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${approved.planId}/next`))).toMatchObject({
          state: "step_available",
          selectedStep: expect.any(Object),
          nextAction: { kind: "call_tool", tool: "step.start_next", shouldContinueRun: true }
        });

        const active = await createActiveStep(context);
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${active.planId}/next`))).toMatchObject({
          state: "active_step",
          selectedStep: { id: active.activeStepId },
          nextAction: { kind: "read_resource", resource: `steps://steps/${active.activeStepId}` }
        });

        const done = await createApprovedPlan(context, "Done Next",);
        const doneStart = await startNextStep(context.client, done.planId);
        await transitionStep(context.client, String(doneStart.state.stepId), "implementing", "verification");
        await transitionStep(context.client, String(doneStart.state.stepId), "verification", "done");
        await startNextStep(context.client, done.planId);
        const secondStepId = String(parseJsonResource(await context.client.readResource(`steps://plans/${done.planId}/next`)).selectedStep?.id ?? done.stepIds[1]);
        if (secondStepId !== done.stepIds[1]) {
          expect(secondStepId).toBe(done.stepIds[1]);
        }
        await transitionStep(context.client, done.stepIds[1], "implementing", "verification");
        await transitionStep(context.client, done.stepIds[1], "verification", "done");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${done.planId}/next`))).toMatchObject({
          state: "all_steps_done",
          nextAction: { kind: "stop", shouldContinueRun: false }
        });

        const paused = await createActiveStep(context);
        await context.client.callTool("plan.pause", { planId: paused.planId, reason: "Pause for integration test." }).then(expectToolSuccess);
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${paused.planId}/next`))).toMatchObject({
          state: "plan_paused"
        });

        const blocked = await createActiveStep(context);
        await context.client.callTool("plan.block", { planId: blocked.planId, reason: "External blocker." }).then(expectToolSuccess);
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${blocked.planId}/next`))).toMatchObject({
          state: "plan_blocked"
        });

        const ordered = await createApprovedPlan(context, "Ordered Blocked", [
          { title: "First ordered", description: "First ordered step", order: 1 },
          { title: "Second ordered", description: "Second ordered step", order: 2 }
        ]);
        const orderedStart = await startNextStep(context.client, ordered.planId);
        await transitionStep(context.client, String(orderedStart.state.stepId), "implementing", "blocked");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${ordered.planId}/next`))).toMatchObject({
          state: "ordered_chain_blocked",
          blockedBy: expect.any(Object)
        });
      });

    case "010":
      return withContext(async (context) => {
        const { planId } = await createPlanWithSteps(context.client, "Summary Plan");
        const summary = parseJsonResource(await context.client.readResource(`steps://plans/${planId}/summary`));
        expect(summary).toMatchObject({
          resourceType: "plan_summary",
          planId,
          planUri: `steps://plans/${planId}`,
          title: "Summary Plan",
          status: "draft",
          stepCounts: { total: 2 },
          nextUri: `steps://plans/${planId}/next`,
          message: expect.any(String)
        });
      });

    case "011":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context, "Verification Blocker", [
          { title: "Only step", description: "Only executable step", order: 1 }
        ]);
        const started = await startNextStep(context.client, fixture.planId);
        const active = { ...fixture, activeStepId: String(started.state.stepId) };
        await transitionStep(context.client, active.activeStepId, "implementing", "verification");
        const timeline = parseJsonResource(await context.client.readResource(`steps://plans/${active.planId}/timeline`));
        expect(timeline).toMatchObject({ resourceType: "plan_timeline", planId: active.planId, events: expect.any(Array) });
        expect(timeline.events.map((event: Record<string, string>) => event.type)).toEqual(
          expect.arrayContaining(["note", "transition"])
        );
      });

    case "012":
      return withContext(async (context) => {
        const { stepIds, planId } = await createPlanWithSteps(context.client);
        const step = parseJsonResource(await context.client.readResource(`steps://steps/${stepIds[0]}`));
        expect(step).toMatchObject({
          resourceType: "step",
          id: stepIds[0],
          planId,
          planUri: `steps://plans/${planId}`,
          title: expect.any(String),
          description: expect.any(String),
          status: "todo",
          historyUri: `steps://steps/${stepIds[0]}/history`
        });
      });

    case "013":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        await transitionStep(context.client, active.activeStepId, "implementing", "verification");
        const history = parseJsonResource(await context.client.readResource(`steps://steps/${active.activeStepId}/history`));
        expect(history).toMatchObject({
          resourceType: "step_history",
          stepId: active.activeStepId,
          notes: expect.any(Array),
          transitions: expect.any(Array)
        });
        expect(history.notes.length).toBeGreaterThanOrEqual(2);
        expect(history.transitions.map((transition: Record<string, string>) => transition.toStatus)).toEqual(
          expect.arrayContaining(["implementing", "verification"])
        );
      });

    case "014":
      return withContext(async (context) => {
        const fixture = await createNoteWithAttachment(context);
        await transitionStep(context.client, fixture.activeStepId, "implementing", "verification");
        const notes = parseJsonResource(await context.client.readResource(`steps://steps/${fixture.activeStepId}/notes`));
        const transitions = parseJsonResource(await context.client.readResource(`steps://steps/${fixture.activeStepId}/transitions`));
        const attachments = parseJsonResource(await context.client.readResource(`steps://steps/${fixture.activeStepId}/attachments`));
        expect(notes).toMatchObject({ resourceType: "step_notes", stepId: fixture.activeStepId, notes: expect.any(Array) });
        expect(transitions).toMatchObject({
          resourceType: "step_transitions",
          stepId: fixture.activeStepId,
          transitions: expect.any(Array)
        });
        expect(attachments).toMatchObject({
          resourceType: "step_attachments",
          stepId: fixture.activeStepId,
          attachments: expect.arrayContaining([expect.objectContaining({ id: fixture.attachmentId })])
        });
      });

    case "015":
      return withContext(async (context) => {
        const fixture = await createNoteWithAttachment(context);
        const note = parseJsonResource(await context.client.readResource(`steps://notes/${fixture.noteId}`));
        const noteAttachments = parseJsonResource(await context.client.readResource(`steps://notes/${fixture.noteId}/attachments`));
        const attachment = parseJsonResource(await context.client.readResource(`steps://attachments/${fixture.attachmentId}`));
        expect(note).toMatchObject({ resourceType: "note", id: fixture.noteId, attachmentsUri: `steps://notes/${fixture.noteId}/attachments` });
        expect(noteAttachments.attachments).toEqual(expect.arrayContaining([expect.objectContaining({ id: fixture.attachmentId })]));
        expect(attachment).toMatchObject({ resourceType: "attachment", id: fixture.attachmentId, contentUri: `steps://attachments/${fixture.attachmentId}/content` });
      });

    case "016":
      return withContext(async (context) => {
        const fixture = await createNoteWithAttachment(context);
        const content = expectJsonRpcSuccess(await context.client.readResource(`steps://attachments/${fixture.attachmentId}/content`));
        expect(content.contents).toHaveLength(1);
        expect(content.contents[0]).toMatchObject({
          uri: `steps://attachments/${fixture.attachmentId}/content`,
          mimeType: "text/plain",
          text: "example evidence"
        });
      });

    case "017":
      return withContext(async ({ client }) => {
        const result = expectJsonRpcSuccess(await client.listPrompts());
        expect(result.prompts.map((prompt: Record<string, string>) => prompt.name)).toEqual(expect.arrayContaining(promptNames));
        for (const prompt of result.prompts) {
          expect(prompt).toEqual(
            expect.objectContaining({
              name: expect.any(String),
              title: expect.any(String),
              description: expect.any(String)
            })
          );
        }
      });

    case "018":
      return withContext(async ({ client }) => {
        for (const name of promptNames) {
          const args = promptArgs(name);
          const result = expectJsonRpcSuccess(await client.getPrompt(name, args));
          expect(result.messages).toHaveLength(1);
          expect(result.messages[0].content.text).toEqual(expect.any(String));
        }
      });

    case "019":
      return withContext(async ({ client }) => {
        expectJsonRpcProtocolError(await client.getPrompt("plan.break_down", {}), -32602);
        expectJsonRpcProtocolError(await client.getPrompt("missing.prompt", {}), -32602);
        expectJsonRpcProtocolError(await client.rpc("prompts/get", {}), -32602);
      });

    case "020":
      return withContext(async ({ client }) => {
        const result = expectJsonRpcSuccess(
          await client.complete({ type: "ref/prompt", name: "session.recover" }, { name: "preferredStatus", value: "exec" })
        );
        expect(result.completion).toMatchObject({ values: expect.any(Array), total: expect.any(Number), hasMore: false });
        expect(result.completion.values.length).toBeGreaterThan(0);
      });

    case "021":
      return withContext(async ({ client }) => {
        const created = expectToolSuccess(await client.callTool("plan.create", { title: "Completion Plan" }));
        const result = expectJsonRpcSuccess(
          await client.complete({ type: "ref/resource", uri: "steps://plans/{planId}" }, { name: "planId", value: "" })
        );
        expect(result.completion.values).toEqual(expect.arrayContaining([created.state.planId]));
      });

    case "022":
      return withContext(async ({ client }) => {
        expectJsonRpcProtocolError(await client.complete({}, { name: "x", value: "" }), -32602);
        expectJsonRpcProtocolError(await client.complete({ type: "ref/prompt", name: "missing.prompt" }, { name: "x", value: "" }), -32602);
        expectJsonRpcProtocolError(await client.complete({ type: "bad/ref" }, { name: "x", value: "" }), -32602);
      });

    case "023":
      return withContext(async ({ client }) => {
        const created = expectToolSuccess(await client.callTool("plan.create", { title: "My Plan" }));
        expectUuid(created.state.planId);
        expectPlanResourceUris(created.resources, String(created.state.planId));
        expect(created.links.reviewUrl).toEqual(expect.stringContaining(`/plans/${created.state.planId}`));
        expect(created.state.planStatus).toBe("draft");
        expect(created.next.recommendedTool).toBe("step.create");
        expect(created.planNextAction).toMatchObject({ kind: "stop", shouldContinueRun: false });
        expectToolError(await client.callTool("plan.create", { title: "   " }), "PLAN_TITLE_REQUIRED", "invalid_request");
        expectToolError(await client.callTool("plan.create", {}), "PLAN_TITLE_REQUIRED", "invalid_request");
      });

    case "024":
      return withContext(async ({ client }) => {
        const created = expectToolSuccess(
          await client.callTool("plan.create_with_steps", {
            title: "My Plan",
            steps: [{ title: "Step 1", description: "Detailed markdown", order: 0 }]
          })
        );
        expect(created.state.planStatus).toBe("draft");
        expect(created.state.stepIds).toHaveLength(1);
        expect(created.next.recommendedUserAction).toBe("show_plan_review_url");
        expect(created.planNextAction).toMatchObject({ kind: "stop", shouldContinueRun: false });
        expectToolError(await client.callTool("plan.create_with_steps", { title: "My Plan", steps: [] }), "PLAN_STEPS_REQUIRED");
        expectToolError(
          await client.callTool("plan.create_with_steps", { title: "My Plan", steps: [{ description: "Desc", order: 0 }] }),
          "STEP_TITLE_REQUIRED"
        );
        expectToolError(
          await client.callTool("plan.create_with_steps", { title: "My Plan", steps: [{ title: "Step", order: 0 }] }),
          "STEP_DESCRIPTION_REQUIRED"
        );
        expectToolError(
          await client.callTool("plan.create_with_steps", {
            title: "My Plan",
            steps: [{ title: "Step", description: "Desc", order: -1 }]
          }),
          "STEP_ORDER_INVALID"
        );
      });

    case "025":
      return withContext(async (context) => {
        const alpha = await createPlanWithSteps(context.client, "Alpha searchable");
        const beta = await createApprovedPlan(context, "Beta searchable");
        const gamma = await createActiveStep(context);
        await transitionStep(context.client, gamma.activeStepId, "implementing", "verification");
        await transitionStep(context.client, gamma.activeStepId, "verification", "done");
        await startNextStep(context.client, gamma.planId);

        const all = expectToolSuccess(await context.client.callTool("plan.list", {}));
        expect(all.state.plans.length).toBeGreaterThanOrEqual(3);
        const approved = expectToolSuccess(await context.client.callTool("plan.list", { status: "approved" }));
        expect(approved.state.plans.every((plan: Record<string, string>) => plan.status === "approved")).toBe(true);
        const queried = expectToolSuccess(await context.client.callTool("plan.list", { query: "Alpha" }));
        expect(queried.state.plans.map((plan: Record<string, string>) => plan.id)).toContain(alpha.planId);
        const active = expectToolSuccess(await context.client.callTool("plan.list", { hasActiveStep: true }));
        expect(active.state.plans.map((plan: Record<string, string>) => plan.id)).toContain(gamma.planId);
        const firstPage = expectToolSuccess(await context.client.callTool("plan.list", { limit: 2 }));
        expect(firstPage.page.limit).toBe(2);
        if (firstPage.page.hasMore) {
          const secondPage = expectToolSuccess(await context.client.callTool("plan.list", { limit: 2, cursor: firstPage.page.nextCursor }));
          const firstIds = new Set(firstPage.state.plans.map((plan: Record<string, string>) => plan.id));
          expect(secondPage.state.plans.some((plan: Record<string, string>) => firstIds.has(plan.id))).toBe(false);
        }
        expect(beta.planId).toEqual(expect.any(String));
        expectToolError(await context.client.callTool("plan.list", { cursor: "invalid-cursor" }), "PLAN_LIST_CURSOR_INVALID");
        expectToolError(await context.client.callTool("plan.list", { status: "unknown-status" }), "PLAN_STATUS_INVALID");
      });

    case "026":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        const updated = expectToolSuccess(await context.client.callTool("plan.update", { planId: fixture.planId, title: "Changed title" }));
        expect(updated.state).toMatchObject({ planId: fixture.planId, title: "Changed title", planStatus: "draft" });
        expect(updated.links.reviewUrl).toEqual(expect.stringContaining(`/plans/${fixture.planId}`));
        expectPlanNextAction(updated);
        expectToolError(await context.client.callTool("plan.update", { planId: fixture.planId }), "PLAN_UPDATE_EMPTY_PATCH");
      });

    case "027":
      return withContext(async (context) => {
        const fixture = await createPlanWithSteps(context.client);
        const approved = expectToolSuccess(
          await context.client.callTool("plan.approve", { planId: fixture.planId, approvalEvidence: "Approved by integration test." })
        );
        expect(approved.state).toMatchObject({ planId: fixture.planId, planStatus: "approved" });
        expect(approved.next.recommendedResource).toBe(`steps://plans/${fixture.planId}/next`);
        expectToolError(
          await context.client.callTool("plan.approve", { planId: fixture.planId, approvalEvidence: "Duplicate approval attempt." }),
          "PLAN_APPROVAL_NOT_ALLOWED"
        );
        const empty = expectToolSuccess(await context.client.callTool("plan.create", { title: "Empty Plan" }));
        expectToolError(
          await context.client.callTool("plan.approve", { planId: empty.state.planId, approvalEvidence: "Approved but empty." }),
          "PLAN_APPROVAL_REQUIRES_STEPS"
        );
      });

    case "028":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const paused = expectToolSuccess(
          await context.client.callTool("plan.pause", { planId: active.planId, reason: "Pause for integration test." })
        );
        expect(paused.state.planStatus).toBe("paused");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${active.planId}/next`)).state).toBe("plan_paused");
        const resumed = expectToolSuccess(await context.client.callTool("plan.resume", { planId: active.planId }));
        expect(resumed.state.planStatus).toBe("executing");
        expectToolError(await context.client.callTool("plan.resume", { planId: active.planId }), "PLAN_RESUME_NOT_ALLOWED");
      });

    case "029":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const blocked = expectToolSuccess(await context.client.callTool("plan.block", { planId: active.planId, reason: "Need user input." }));
        expect(blocked.state.planStatus).toBe("blocked");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${active.planId}/next`)).state).toBe("plan_blocked");
        const unblocked = expectToolSuccess(await context.client.callTool("plan.unblock", { planId: active.planId }));
        expect(unblocked.state.planStatus).toBe("executing");
        expectToolError(await context.client.callTool("plan.unblock", { planId: active.planId }), "PLAN_UNBLOCK_NOT_ALLOWED");
      });

    case "030":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        const reordered = expectToolSuccess(
          await context.client.callTool("plan.reorder_steps", {
            planId: fixture.planId,
            stepOrders: [
              { stepId: fixture.stepIds[1], order: 1 },
              { stepId: fixture.stepIds[0], order: 2 }
            ]
          })
        );
        expect(reordered.state.planStatus).toBe("draft");
        const steps = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/steps`));
        expect(steps.steps[0].id).toBe(fixture.stepIds[1]);
        expectToolError(
          await context.client.callTool("plan.reorder_steps", {
            planId: fixture.planId,
            stepOrders: [
              { stepId: fixture.stepIds[0], order: 1 },
              { stepId: fixture.stepIds[0], order: 2 }
            ]
          }),
          "PLAN_REORDER_STEP_DUPLICATE"
        );
      });

    case "031":
      return withContext(async (context) => {
        const fixture = await createPlanWithSteps(context.client);
        expectToolError(await context.client.callTool("plan.delete", { planId: fixture.planId }), "PLAN_DELETE_CONFIRMATION_REQUIRED");
        const deleted = expectToolSuccess(
          await context.client.callTool("plan.delete", { planId: fixture.planId, confirmDeleteContainedData: true })
        );
        expect(deleted.state).toMatchObject({ planId: fixture.planId, deleted: true });
        expectResourceNotFound(await context.client.readResource(`steps://plans/${fixture.planId}`), "PLAN_NOT_FOUND");
      });

    case "032":
      return withContext(async (context) => {
        const plan = expectToolSuccess(await context.client.callTool("plan.create", { title: "Step Container" }));
        const created = expectToolSuccess(
          await context.client.callTool("step.create", {
            planId: plan.state.planId,
            title: "New Step",
            description: "Detailed markdown",
            order: 0
          })
        );
        expect(created.state).toMatchObject({ planId: plan.state.planId, status: "todo", order: 0 });
        expectToolError(await context.client.callTool("step.create", { planId: plan.state.planId, description: "Desc", order: 0 }), "STEP_TITLE_REQUIRED");
        expectToolError(await context.client.callTool("step.create", { planId: plan.state.planId, title: "Step", order: 0 }), "STEP_DESCRIPTION_REQUIRED");
        expectToolError(
          await context.client.callTool("step.create", { planId: plan.state.planId, title: "Step", description: "Desc", order: -1 }),
          "STEP_ORDER_INVALID"
        );
      });

    case "033":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        const updated = expectToolSuccess(
          await context.client.callTool("step.update", { stepId: fixture.stepIds[0], title: "Updated Step", order: 2 })
        );
        expect(updated.state).toMatchObject({ stepId: fixture.stepIds[0], planStatus: "draft", order: 2 });
        expectToolError(await context.client.callTool("step.update", { stepId: fixture.stepIds[0] }), "STEP_UPDATE_EMPTY_PATCH");
        expectToolError(await context.client.callTool("step.update", { stepId: fixture.stepIds[0], status: "done" }), "STEP_STATUS_UPDATE_NOT_ALLOWED");
      });

    case "034":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        const started = await startNextStep(context.client, fixture.planId);
        expect(started.state).toMatchObject({
          planId: fixture.planId,
          previousPlanStatus: "approved",
          planStatus: "executing",
          previousStatus: "todo",
          status: "implementing"
        });
        expect(started.resources).toMatchObject({
          stepUri: `steps://steps/${started.state.stepId}`,
          historyUri: `steps://steps/${started.state.stepId}/history`
        });
        expectPlanNextAction(started);
      });

    case "035":
      return withContext(async (context) => {
        const draft = await createPlanWithSteps(context.client);
        expectToolError(
          await context.client.callTool("step.start_next", { planId: draft.planId, noteText: "Start", author: "agent" }),
          "PLAN_NOT_APPROVED"
        );
        const active = await createActiveStep(context);
        expectToolError(
          await context.client.callTool("step.start_next", { planId: active.planId, noteText: "Start", author: "agent" }),
          "PLAN_HAS_ACTIVE_STEP"
        );
        const approved = await createApprovedPlan(context, "Missing note");
        expectToolError(await context.client.callTool("step.start_next", { planId: approved.planId, author: "agent" }), "NOTE_TEXT_REQUIRED");
        expectToolError(
          await context.client.callTool("step.start_next", { planId: approved.planId, noteText: "Start", author: "robot" }),
          "NOTE_AUTHOR_INVALID"
        );
      });

    case "036":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const verification = await transitionStep(context.client, active.activeStepId, "implementing", "verification");
        expect(verification.state.status).toBe("verification");
        const rework = await transitionStep(context.client, active.activeStepId, "verification", "implementing");
        expect(rework.state.status).toBe("implementing");
        await transitionStep(context.client, active.activeStepId, "implementing", "verification");
        const done = await transitionStep(context.client, active.activeStepId, "verification", "done");
        expect(done.state.status).toBe("done");
        expect(done.next.recommendedResource).toBe(`steps://plans/${active.planId}/next`);
      });

    case "037":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        expectToolError(
          await context.client.callTool("step.transition", {
            stepId: active.activeStepId,
            fromStatus: "todo",
            toStatus: "done",
            noteText: "Wrong",
            author: "agent"
          }),
          "STEP_TRANSITION_FROM_STATUS_MISMATCH"
        );
        expectToolError(
          await context.client.callTool("step.transition", {
            stepId: active.activeStepId,
            fromStatus: "implementing",
            toStatus: "done",
            noteText: "Wrong",
            author: "agent"
          }),
          "STEP_TRANSITION_NOT_ALLOWED"
        );
        expectToolError(
          await context.client.callTool("step.transition", {
            stepId: active.activeStepId,
            fromStatus: "implementing",
            toStatus: "verification",
            author: "agent"
          }),
          "STEP_TRANSITION_NOTE_REQUIRED"
        );
      });

    case "038":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        expectToolError(await context.client.callTool("step.delete", { stepId: fixture.stepIds[0] }), "STEP_DELETE_CONFIRMATION_REQUIRED");
        const deleted = expectToolSuccess(
          await context.client.callTool("step.delete", { stepId: fixture.stepIds[0], confirmDeleteRelatedData: true })
        );
        expect(deleted.state).toMatchObject({ stepId: fixture.stepIds[0], deleted: true, planStatus: "draft" });
        expect(deleted.next.recommendedResource).toBe(`steps://plans/${fixture.planId}/steps`);
      });

    case "039":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const note = await createNote(context.client, active.activeStepId, "Useful note.");
        expect(note.state).toMatchObject({ stepId: active.activeStepId, author: "agent" });
        expect(note.resources.attachmentsUri).toBe(`steps://notes/${note.state.noteId}/attachments`);
        expectToolError(await context.client.callTool("note.create", { stepId: active.activeStepId, author: "agent" }), "NOTE_TEXT_REQUIRED");
        expectToolError(
          await context.client.callTool("note.create", { stepId: active.activeStepId, text: "x", author: "bot" }),
          "NOTE_AUTHOR_INVALID"
        );
      });

    case "040":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const history = parseJsonResource(await context.client.readResource(`steps://steps/${active.activeStepId}/history`));
        const transition = history.events.find((event: Record<string, string>) => event.type === "transition");
        const transitionNoteId = transition.noteId;
        expectToolError(
          await context.client.callTool("note.delete", { noteId: transitionNoteId, confirmDeleteAttachments: false }),
          "NOTE_DELETE_REQUIRED_BY_TRANSITION"
        );
        const note = await createNote(context.client, active.activeStepId, "Delete me.");
        await createAttachment(context.client, String(note.state.noteId));
        expectToolError(
          await context.client.callTool("note.delete", { noteId: note.state.noteId, confirmDeleteAttachments: false }),
          "NOTE_DELETE_ATTACHMENTS_CONFIRMATION_REQUIRED"
        );
        const deleted = expectToolSuccess(
          await context.client.callTool("note.delete", { noteId: note.state.noteId, confirmDeleteAttachments: true })
        );
        expect(deleted.state.deleted).toBe(true);
      });

    case "041":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const note = await createNote(context.client, active.activeStepId);
        const attachment = await createAttachment(context.client, String(note.state.noteId), "result.txt");
        expect(attachment.state).toMatchObject({ noteId: note.state.noteId, name: "result.txt", contentAvailable: true });
        expectToolError(await context.client.callTool("attachment.create", { noteId: note.state.noteId }), "ATTACHMENT_NAME_REQUIRED");
        expectToolError(
          await context.client.callTool("attachment.create", { noteId: note.state.noteId, name: "bad.bin", content: { blob: "AAAA" } }),
          "ATTACHMENT_CONTENT_INVALID"
        );
      });

    case "042":
      return withContext(async (context) => {
        const fixture = await createNoteWithAttachment(context);
        const updated = expectToolSuccess(
          await context.client.callTool("attachment.update", {
            attachmentId: fixture.attachmentId,
            name: "updated.txt",
            mimeType: "text/plain"
          })
        );
        expect(updated.state.name).toBe("updated.txt");
        expectToolError(await context.client.callTool("attachment.update", { attachmentId: fixture.attachmentId }), "ATTACHMENT_UPDATE_EMPTY_PATCH");
        expectToolError(await context.client.callTool("attachment.delete", { attachmentId: fixture.attachmentId }), "ATTACHMENT_DELETE_CONFIRMATION_REQUIRED");
        const deleted = expectToolSuccess(
          await context.client.callTool("attachment.delete", { attachmentId: fixture.attachmentId, confirmDeleteContent: true })
        );
        expect(deleted.state.deleted).toBe(true);
      });

    case "043":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        const first = await startNextStep(context.client, fixture.planId, "start-next-key");
        const second = await startNextStep(context.client, fixture.planId, "start-next-key");
        expect(second.state.transitionId).toBe(first.state.transitionId);
        const history = parseJsonResource(await context.client.readResource(`steps://steps/${first.state.stepId}/history`));
        expect(history.transitions.filter((transition: Record<string, string>) => transition.toStatus === "implementing")).toHaveLength(1);
      });

    case "044":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        const first = await transitionStep(context.client, active.activeStepId, "implementing", "verification", "transition-key");
        const second = await transitionStep(context.client, active.activeStepId, "implementing", "verification", "transition-key");
        expect(second.state.transitionId).toBe(first.state.transitionId);
        const history = parseJsonResource(await context.client.readResource(`steps://steps/${active.activeStepId}/history`));
        expect(history.transitions.filter((transition: Record<string, string>) => transition.toStatus === "verification")).toHaveLength(1);
      });

    case "045":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context);
        await startNextStep(context.client, fixture.planId, "same-key");
        expectToolError(
          await context.client.callTool(
            "step.start_next",
            { planId: fixture.planId, noteText: "Different payload", author: "agent" },
            { idempotencyKey: "same-key" }
          ),
          "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_ARGUMENTS",
          "invalid_request"
        );
      });

    case "046":
      return withContext(async ({ client }) => {
        const initialize = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "test-client" }, capabilities: {} },
          { useSession: false }
        );
        const firstSession = initialize.headers["mcp-session-id"] as string | undefined;
        expect(firstSession).toBeDefined();
        await client.notify("notifications/initialized");
        const fixture = await createPlanWithSteps(client, "Persistent Plan");

        const statelessList = await client.rpc("tools/list", {}, { useSession: false });
        expectJsonRpcSuccess(statelessList);
        const autoSession = statelessList.headers["mcp-session-id"] as string | undefined;
        expect(autoSession).toBeDefined();
        expect(autoSession).not.toBe(firstSession);
        expectJsonRpcProtocolError(await client.rpc("tools/list", {}, { headers: { "MCP-Session-Id": "expired-session" }, useSession: false }), -32002);
        expectToolSuccess(
          await client.callTool(
            "server.get_started",
            {},
            undefined,
            { headers: { "MCP-Session-Id": "11111111-1111-4111-8111-111111111111" }, useSession: false }
          )
        );

        const secondInitialize = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "test-client-2" }, capabilities: {} },
          { useSession: false }
        );
        const secondSession = secondInitialize.headers["mcp-session-id"] as string | undefined;
        expect(secondSession).toBeDefined();
        expect(secondSession).not.toBe(firstSession);
        await client.notify("notifications/initialized");
        expectJsonRpcSuccess(await client.rpc("tools/list", {}, { headers: { "MCP-Session-Id": firstSession ?? "" }, useSession: false }));
        const listed = expectToolSuccess(await client.callTool("plan.list", { query: "Persistent" }));
        expect(listed.state.plans.map((plan: Record<string, string>) => plan.id)).toContain(fixture.planId);
      }, false);

    case "047":
      return withContext(async ({ client }) => {
        const allowed = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "origin-client" }, capabilities: {} },
          { headers: { Origin: "http://localhost:3000" }, useSession: false }
        );
        expect([200, 202]).toContain(allowed.status);
        const blocked = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "origin-client" }, capabilities: {} },
          { headers: { Origin: "http://evil.com" }, useSession: false }
        );
        expect(blocked.status).toBe(403);
        const noOrigin = await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "origin-client" }, capabilities: {} },
          { useSession: false }
        );
        expect([200, 202]).toContain(noOrigin.status);
      }, false);

    case "048":
      return withContext(async (context) => {
        const fixture = await createPlanWithSteps(context.client, "Progress Delete", [
          { title: "One", description: "First", order: 0 },
          { title: "Two", description: "Second", order: 0 },
          { title: "Three", description: "Third", order: 0 }
        ]);
        const response = await context.client.callTool(
          "plan.delete",
          { planId: fixture.planId, confirmDeleteContainedData: true },
          { progressToken: "progress-1" },
          { headers: { Accept: "text/event-stream" } }
        );
        expect(response.status).toBe(200);
        expect(response.text).toContain("notifications/progress");
        const events = response.text
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => JSON.parse(line.slice("data: ".length)));
        const progressEvents = events.filter((event) => event.method === "notifications/progress");
        expect(progressEvents.length).toBeGreaterThan(0);
        expect(progressEvents.map((event) => event.params.progress)).toEqual([...progressEvents.map((event) => event.params.progress)].sort());
        expect(events.at(-1)).toMatchObject({ jsonrpc: "2.0", result: expect.any(Object) });
      });

    case "049":
      return withContext(async (context) => {
        const fixture = await createPlanWithSteps(context.client, "Workflow Plan");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`)).state).toBe("plan_not_approved");
        await approvePlan(context.client, fixture.planId);

        for (let guard = 0; guard < 5; guard += 1) {
          const next = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`));
          if (next.state === "all_steps_done") break;
          expect(next.state).toBe("step_available");
          const started = await startNextStep(context.client, fixture.planId);
          await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
          await transitionStep(context.client, String(started.state.stepId), "verification", "done");
        }

        const finalNext = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`));
        const plan = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}`));
        expect(finalNext.state).toBe("all_steps_done");
        expect(plan.status).toBe("completed");
      });

    case "050":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context, "Verification Blocker", [
          { title: "Only ordered step", description: "Only executable step", order: 1 }
        ]);
        const started = await startNextStep(context.client, fixture.planId);
        const active = { ...fixture, activeStepId: String(started.state.stepId) };
        await transitionStep(context.client, active.activeStepId, "implementing", "verification");
        const rework = await transitionStep(context.client, active.activeStepId, "verification", "implementing");
        expect(rework.state.status).toBe("implementing");
        const blocked = await transitionStep(context.client, active.activeStepId, "implementing", "blocked");
        expect(blocked.state.status).toBe("blocked");
        const next = parseJsonResource(await context.client.readResource(`steps://plans/${active.planId}/next`));
        expect(["ordered_chain_blocked", "no_steps"]).toContain(next.state);
        expect(next.nextAction.shouldContinueRun).toBe(false);
      });

    case "051":
      return withContext(async (context) => {
        const fixture = await createApprovedPlan(context, "Ordered Workflow", [
          { title: "First ordered", description: "First ordered step", order: 1 },
          { title: "Second ordered", description: "Second ordered step", order: 2 }
        ]);
        const started = await startNextStep(context.client, fixture.planId);
        expect(started.state.stepId).toBe(fixture.stepIds[0]);
        await transitionStep(context.client, String(started.state.stepId), "implementing", "blocked");
        const blockedNext = parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`));
        expect(blockedNext.state).toBe("ordered_chain_blocked");
        await transitionStep(context.client, String(started.state.stepId), "blocked", "implementing");
        await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
        await transitionStep(context.client, String(started.state.stepId), "verification", "done");
        expect(parseJsonResource(await context.client.readResource(`steps://plans/${fixture.planId}/next`)).state).toBe("step_available");
      });

    case "052":
      return withContext(async ({ client }) => {
        const fixture = await createApprovedPlan({ client } as McpContractContext, "Recoverable Plan");
        const started = await startNextStep(client, fixture.planId);
        expect(started.state.status).toBe("implementing");
        await client.rpc(
          "initialize",
          { protocolVersion: "2025-11-25", clientInfo: { name: "recovered-client" }, capabilities: {} },
          { useSession: false }
        );
        await client.notify("notifications/initialized");
        const listed = expectToolSuccess(await client.callTool("plan.list", { hasActiveStep: true }));
        expect(listed.state.plans.map((plan: Record<string, string>) => plan.id)).toContain(fixture.planId);
        const next = parseJsonResource(await client.readResource(`steps://plans/${fixture.planId}/next`));
        expect(next).toMatchObject({ state: "active_step", selectedStep: { id: started.state.stepId } });
      });

    case "053":
      return withContext(async ({ client }) => {
        const missingPlanId = "00000000-0000-4000-8000-999999999999";
        const missingStepId = "10000000-0000-4000-8000-999999999999";
        const missingNoteId = "20000000-0000-4000-8000-999999999999";
        expectResourceNotFound(await client.readResource(`steps://plans/${missingPlanId}`), "PLAN_NOT_FOUND");
        const missingPlanError = expectToolError(
          await client.callTool("plan.approve", { planId: missingPlanId, approvalEvidence: "Approved by integration test." }),
          "PLAN_NOT_FOUND",
          "not_found"
        );
        expect(missingPlanError.resources).toMatchObject({ planUri: `steps://plans/${missingPlanId}` });
        expectResourceNotFound(await client.readResource(`steps://steps/${missingStepId}`), "STEP_NOT_FOUND");
        const missingStepError = expectToolError(
          await client.callTool("note.create", { stepId: missingStepId, text: "x", author: "agent" }),
          "STEP_NOT_FOUND",
          "not_found"
        );
        expect(missingStepError.resources).toMatchObject({ stepUri: `steps://steps/${missingStepId}` });
        const missingNoteError = expectToolError(await client.callTool("attachment.create", { noteId: missingNoteId, name: "x" }), "NOTE_NOT_FOUND", "not_found");
        expect(missingNoteError.resources).toMatchObject({ noteUri: `steps://notes/${missingNoteId}` });
        expectResourceNotFound(await client.readResource(`steps://notes/${missingNoteId}`), "NOTE_NOT_FOUND");
        expectResourceNotFound(await client.readResource("steps://attachments/40000000-0000-4000-8000-999999999999"), "ATTACHMENT_NOT_FOUND");
      });

    case "054":
      return withContext(async (context) => {
        const plan = expectToolSuccess(await context.client.callTool("plan.create", { title: "Contract Empty Plan" }));
        assertToolContract(plan);
        const step = expectToolSuccess(
          await context.client.callTool("step.create", {
            planId: plan.state.planId,
            title: "Contract Step",
            description: "Detailed",
            order: 0
          })
        );
        assertToolContract(step);
        const approved = expectToolSuccess(
          await context.client.callTool("plan.approve", {
            planId: plan.state.planId,
            approvalEvidence: "Approved by integration test."
          })
        );
        assertToolContract(approved);
        const started = await startNextStep(context.client, String(plan.state.planId));
        assertToolContract(started);
        const verification = await transitionStep(context.client, String(started.state.stepId), "implementing", "verification");
        assertToolContract(verification);
        const note = await createNote(context.client, String(started.state.stepId));
        assertToolContract(note);
        const attachment = await createAttachment(context.client, String(note.state.noteId));
        assertToolContract(attachment);
        const updatedAttachment = expectToolSuccess(
          await context.client.callTool("attachment.update", { attachmentId: attachment.state.attachmentId, name: "contract.txt" })
        );
        assertToolContract(updatedAttachment);

        const separate = await createActiveStep(context);
        assertToolContract(
          expectToolSuccess(await context.client.callTool("plan.pause", { planId: separate.planId, reason: "Pause for contract test." }))
        );
        assertToolContract(expectToolSuccess(await context.client.callTool("plan.resume", { planId: separate.planId })));
        assertToolContract(expectToolSuccess(await context.client.callTool("plan.block", { planId: separate.planId, reason: "Need input" })));
        assertToolContract(expectToolSuccess(await context.client.callTool("plan.unblock", { planId: separate.planId })));
        const reorder = await createApprovedPlan(context, "Contract Reorder");
        assertToolContract(
          expectToolSuccess(
            await context.client.callTool("plan.reorder_steps", {
              planId: reorder.planId,
              stepOrders: [
                { stepId: reorder.stepIds[1], order: 1 },
                { stepId: reorder.stepIds[0], order: 2 }
              ]
            })
          )
        );
      });

    case "055":
      return withContext(async ({ client }) => {
        expectJsonRpcProtocolError(await client.rawText('{ "jsonrpc": "2.0", "method": ', { useSession: false }), -32600);
        expectJsonRpcProtocolError(await client.raw({ id: 1, method: "tools/list", params: {} }), -32600);
        expectJsonRpcProtocolError(await client.rpc("unknown.method"), -32601);
        expectJsonRpcProtocolError(await client.rpc("tools/call", {}), -32602);
      });

    case "056":
      return withContext(async (context) => {
        const active = await createActiveStep(context);
        await createPlanWithSteps(context.client, "Inactive Plan");
        const prompt = expectJsonRpcSuccess(await context.client.getPrompt("session.recover", {}));
        expect(prompt.messages[0].content.text).toContain("plan.list");
        const listed = expectToolSuccess(await context.client.callTool("plan.list", { hasActiveStep: true }));
        expect(listed.state.plans.map((plan: Record<string, string>) => plan.id)).toContain(active.planId);
        expect(listed.state.plans.every((plan: Record<string, string>) => plan.nextUri)).toBe(true);
      });
  }
}

function promptArgs(name: string): Record<string, string> {
  const planId = "00000000-0000-4000-8000-000000000001";
  const stepId = "00000000-0000-4000-8000-000000000002";
  switch (name) {
    case "plan.break_down":
      return { goal: "Build contract tests" };
    case "plan.continue":
    case "plan.execute":
      return { planId };
    case "step.verify":
    case "step.summarize_history":
      return { stepId };
    case "step.explain_blocker":
      return { stepId, blocker: "External API credentials are missing." };
    case "transition.prepare_note":
      return { stepId, toStatus: "verification", reason: "Implementation is ready for verification." };
    default:
      return {};
  }
}
