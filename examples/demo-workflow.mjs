const endpoint = process.env.STEPS_MCP_URL ?? "http://127.0.0.1:3001/mcp";

let requestId = 1;
let sessionId;

async function send(method, params = {}, { notification = false, useSession = true } = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(useSession && sessionId ? { "MCP-Session-Id": sessionId } : {})
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      ...(notification ? {} : { id: requestId++ }),
      method,
      params
    })
  });

  const returnedSessionId = response.headers.get("MCP-Session-Id");
  if (returnedSessionId) sessionId = returnedSessionId;

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP request failed with ${response.status}: ${text}`);
  }
  if (notification || text.length === 0) return undefined;

  const payload = JSON.parse(text);
  if (payload.error) {
    throw new Error(`${payload.error.message}: ${JSON.stringify(payload.error.data ?? {})}`);
  }
  return payload.result;
}

async function callTool(name, args) {
  const result = await send("tools/call", { name, arguments: args });
  if (result.isError || result.structuredContent?.ok !== true) {
    throw new Error(`${name} failed: ${JSON.stringify(result.structuredContent ?? result)}`);
  }
  return result.structuredContent;
}

function description({ summary, outcome, requirements, acceptance, verification, notes = "None." }) {
  return `## Summary
${summary}

## Outcome
${outcome}

## Context / User story
Steps MCP should make long-running agent work reviewable and recoverable.

As an AI agent
I want a durable plan with explicit state transitions
So that I can continue work safely without losing context

## Scope

### Included
- The concrete deliverable for this step
- Durable progress and verification evidence

### Not included
- Unrelated product features
- Production credentials or private data

## Requirements
${requirements.map((item) => `- ${item}`).join("\n")}

## Constraints
- Keep MCP-facing text concise and actionable
- Preserve workflow state in SQLite

## Acceptance criteria
${acceptance.map((item) => `- [ ] ${item}`).join("\n")}

## Verification
${verification}

### Preparation
- [ ] Prepare isolated test data

### Execution
- [ ] Run the relevant automated and manual checks

### Cleanup / Finalization
- [ ] Record the result in a durable note

## Notes
${notes}`;
}

async function transition(stepId, fromStatus, toStatus, noteText) {
  return callTool("step.transition", {
    stepId,
    fromStatus,
    toStatus,
    noteText,
    author: "agent"
  });
}

await send(
  "initialize",
  {
    protocolVersion: "2025-11-25",
    clientInfo: { name: "steps-demo-seeder", version: "1.0.0" },
    capabilities: {}
  },
  { useSession: false }
);
await send("notifications/initialized", {}, { notification: true });

await callTool("plan.create_with_steps", {
  title: "Document recovery workflows",
  steps: [
    {
      title: "Describe session recovery",
      description: description({
        summary: "Document how an agent resumes work after losing local context.",
        outcome: "The recovery guide identifies the plan, active step, and next safe action.",
        requirements: ["Use durable plan resources", "Explain session.recover"],
        acceptance: ["A new agent can find the active work", "Recovery does not repeat completed steps"],
        verification: "Start a new MCP session and follow the recovery prompt."
      }),
      order: 1
    },
    {
      title: "Add interruption examples",
      description: description({
        summary: "Add examples for interrupted implementation and verification work.",
        outcome: "The guide covers both resumable work and honest blockers.",
        requirements: ["Show implementing recovery", "Show verification recovery"],
        acceptance: ["Both examples include the next resource", "No state is inferred from chat history alone"],
        verification: "Review every example against the state-machine rules."
      }),
      order: 2
    }
  ]
});

const primary = await callTool("plan.create_with_steps", {
  title: "Launch Steps MCP 1.0",
  steps: [
    {
      title: "Define the agent workflow",
      description: description({
        summary: "Define the review, execution, verification, and recovery lifecycle for agents.",
        outcome: "Every workflow state has a clear purpose and safe next action.",
        requirements: ["Keep tool descriptions short", "Return next actions in responses and errors"],
        acceptance: ["The lifecycle is documented", "Invalid transitions are diagnosable"],
        verification: "Run state-machine and response-contract tests."
      }),
      order: 1
    },
    {
      title: "Implement durable MCP state",
      description: description({
        summary: "Persist plans, steps, notes, transitions, and attachments in SQLite.",
        outcome: "Agent work survives restarts and can be recovered from MCP resources.",
        requirements: ["Apply migrations automatically", "Keep transitions note-backed"],
        acceptance: ["Data survives a server restart", "Resources reconstruct the full history"],
        verification: "Run migration, recovery, and idempotency integration tests."
      }),
      order: 2
    },
    {
      title: "Polish the review dashboard",
      description: description({
        summary: "Make plan progress and step state immediately understandable in the browser UI.",
        outcome: "Users can review plans, inspect evidence, and see work move across the board.",
        requirements: ["Show all workflow columns", "Keep notes and transition history accessible"],
        acceptance: ["The board is readable at desktop width", "The detail view shows durable evidence"],
        verification: "Review the board and step detail views at a stable desktop viewport.",
        notes: "Capture the final views for the public README."
      }),
      order: 3
    },
    {
      title: "Publish the multi-platform image",
      description: description({
        summary: "Publish a production Docker image for AMD64 and ARM64 through GitHub Actions.",
        outcome: "Users can start Steps MCP with one Docker command on common platforms.",
        requirements: ["Publish latest and immutable SHA tags", "Run tests before publishing"],
        acceptance: ["Both platforms are present in the manifest", "The container health check passes"],
        verification: "Build the image locally and inspect the published manifest."
      }),
      order: 4
    },
    {
      title: "Validate the installation guide",
      description: description({
        summary: "Verify the Docker, Compose, endpoint, and persistence instructions from a clean environment.",
        outcome: "A new user can launch the server and connect an MCP client without hidden steps.",
        requirements: ["Document all three public endpoints", "Explain the persistent volume"],
        acceptance: ["Docker instructions work verbatim", "The browser UI opens with persisted data"],
        verification: "Follow the README from a clean Docker environment."
      }),
      order: 5
    }
  ]
});

const planId = primary.state.planId;
const [workflowStep, storageStep, dashboardStep, imageStep] = primary.state.stepIds;

await callTool("plan.approve", {
  planId,
  approvalEvidence: "The user reviewed the plan in the browser UI and approved the 1.0 launch workflow."
});

await transition(workflowStep, "todo", "implementing", "The lifecycle contract is ready for implementation.");
await transition(workflowStep, "implementing", "verification", "Tool descriptions, responses, and error responsibilities are implemented.");
await transition(workflowStep, "verification", "done", "Contract and state-machine tests passed; the workflow is complete.");

await transition(storageStep, "todo", "implementing", "SQLite repositories and migrations are being integrated.");
await transition(storageStep, "implementing", "verification", "Persistence, idempotency, and recovery behavior are ready for verification.");
await transition(storageStep, "verification", "done", "Restart and recovery tests passed with durable history intact.");

await transition(dashboardStep, "todo", "implementing", "The unified plan rail and five-column workflow board are implemented.");
await transition(dashboardStep, "implementing", "verification", "The dashboard is ready for final visual review and README screenshots.");
await callTool("note.create", {
  stepId: dashboardStep,
  text: "Visual review focus: column balance, readable step summaries, and discoverable activity history.",
  author: "agent"
});

await transition(imageStep, "todo", "implementing", "The CI workflow now builds and publishes AMD64 and ARM64 images after tests pass.");
const releaseNote = await callTool("note.create", {
  stepId: imageStep,
  text: "The local container build and non-root runtime smoke test passed. The GHCR publish job is ready for the first push.",
  author: "agent"
});
await callTool("attachment.create", {
  noteId: releaseNote.state.noteId,
  name: "release-checklist.md",
  mimeType: "text/markdown",
  content: {
    text: "# Release checklist\n\n- [x] Typecheck\n- [x] 72 tests\n- [x] Production build\n- [x] Docker smoke test\n- [ ] Verify GHCR manifest"
  }
});

const origin = new URL(endpoint).origin;
process.stdout.write(
  `${JSON.stringify(
    {
      planId,
      reviewUrl: `${origin}/plans/${planId}`,
      endpoint
    },
    null,
    2
  )}\n`
);
