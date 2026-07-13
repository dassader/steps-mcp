import { stepDescriptionFormatInstruction } from "../domain/step-description-format.js";

export interface StaticResourceDefinition {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
}

export interface ResourceTemplateDefinition {
  uriTemplate: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
}

export const documentationResources: StaticResourceDefinition[] = [
  {
    uri: "steps://docs/overview",
    name: "steps.docs.overview",
    title: "Steps MCP Overview",
    description: "Explains what the Steps MCP server does and where to read next.",
    mimeType: "text/markdown",
    text: "# Steps MCP Overview\n\nSteps MCP stores reviewable plans, executable steps, notes, transitions, and attachments. Start with a plan, show its review URL to the user, wait for approval, then execute server-selected steps until the server reports that there is no next action.\n\nMCP clients may use the standard initialize and notifications/initialized handshake. For simple HTTP JSON-RPC clients, ordinary MCP methods without an MCP-Session-Id header are automatically given an initialized session and the response returns MCP-Session-Id for later calls. If a client sends an invalid or uninitialized MCP-Session-Id, the server returns SERVER_NOT_INITIALIZED so the client can fix or refresh that session."
  },
  {
    uri: "steps://docs/concepts/plan",
    name: "steps.docs.concepts.plan",
    title: "Plan Concept",
    description: "Explains the plan concept and its role in Steps MCP.",
    mimeType: "text/markdown",
    text: "# Plan Concept\n\nA plan is the reviewable container for work. It owns ordered or independent steps, exposes progress, and provides a user-facing review URL at `/plans/{planId}`."
  },
  {
    uri: "steps://docs/concepts/step",
    name: "steps.docs.concepts.step",
    title: "Step Concept",
    description: "Explains executable steps and how agents should work with them.",
    mimeType: "text/markdown",
    text: "# Step Concept\n\nA step is one executable unit of work inside a plan. Agents update title and description directly, but status changes must happen through note-backed transitions."
  },
  {
    uri: "steps://docs/concepts/note",
    name: "steps.docs.concepts.note",
    title: "Note Concept",
    description: "Explains notes as durable work context.",
    mimeType: "text/markdown",
    text: "# Note Concept\n\nA note records durable context for a step. Notes explain decisions, blockers, verification results, and the reason for a status transition."
  },
  {
    uri: "steps://docs/concepts/transition",
    name: "steps.docs.concepts.transition",
    title: "Transition Concept",
    description: "Explains state transitions and their audit notes.",
    mimeType: "text/markdown",
    text: "# Transition Concept\n\nA transition changes a step status and must include a note. This keeps the state machine auditable for both users and AI agents."
  },
  {
    uri: "steps://docs/concepts/attachment",
    name: "steps.docs.concepts.attachment",
    title: "Attachment Concept",
    description: "Explains attachments and content resources.",
    mimeType: "text/markdown",
    text: "# Attachment Concept\n\nAn attachment belongs to a note. It can provide metadata, text content, binary content, or a link that gives agents additional work context without bloating tool descriptions."
  },
  {
    uri: "steps://docs/flows/execution",
    name: "steps.docs.flows.execution",
    title: "Execution Flow",
    description: "Explains the overall execution flow for agents.",
    mimeType: "text/markdown",
    text: "# Execution Flow\n\nCreate or read a plan, show the review URL to the user, wait for approval, then repeatedly ask the server for next work. Do not ask the user after every next step unless the server requires user input."
  },
  {
    uri: "steps://docs/flows/planning",
    name: "steps.docs.flows.planning",
    title: "Planning Flow",
    description: "Explains how agents create reviewable plans.",
    mimeType: "text/markdown",
    text: `# Planning Flow

When the user asks to use Steps MCP, create a detailed markdown plan and steps. Step descriptions must follow the shared format below. Return the review URL and stop until the user approves execution.

${stepDescriptionFormatInstruction}`
  },
  {
    uri: "steps://docs/flows/review",
    name: "steps.docs.flows.review",
    title: "Review Flow",
    description: "Explains the user review boundary before execution.",
    mimeType: "text/markdown",
    text: "# Review Flow\n\nThe review boundary protects the user from unintended execution. The agent should show `/plans/{planId}` and continue only after explicit approval."
  },
  {
    uri: "steps://docs/flows/run",
    name: "steps.docs.flows.run",
    title: "Run Flow",
    description: "Explains how agents loop through server-selected work.",
    mimeType: "text/markdown",
    text: "# Run Flow\n\nAfter approval, the agent should keep requesting and executing the server-selected next step until the server returns a stop, blocked, completed, or user-input-required state."
  },
  {
    uri: "steps://docs/flows/status",
    name: "steps.docs.flows.status",
    title: "Status Flow",
    description: "Explains plan and step statuses.",
    mimeType: "text/markdown",
    text: "# Status Flow\n\nPlan statuses describe review and execution state. Step statuses move through todo, implementing, verification, blocked, and done using allowed note-backed transitions.\n\nUse blocked when required work cannot continue honestly. Do not mark a step done unless every required acceptance criterion was actually satisfied or the user explicitly changed or removed that criterion. Read steps://docs/flows/blocking before deciding whether to block."
  },
  {
    uri: "steps://docs/flows/blocking",
    name: "steps.docs.flows.blocking",
    title: "Blocking Flow",
    description: "Explains when agents must block a step or plan instead of marking work done.",
    mimeType: "text/markdown",
    text: "# Blocking Flow\n\nMove a step to blocked when required work cannot continue, cannot be verified, or cannot be completed without violating a constraint. Blocking is the honest state for unfinished required work.\n\nA step must be blocked instead of done when any required acceptance criterion would require violating an explicit user instruction, touching a protected system such as Docker, production, shared services, or user data without permission, performing a destructive or deployment action without explicit approval, using unavailable credentials, permissions, hardware, network access, or external services, making a product decision that needs user input, bypassing a policy, safety boundary, review gate, or required human approval, claiming verification that was not actually performed, continuing after the user explicitly asked to stop, or resolving a contradiction between the plan and a newer user instruction without honest plan/step state.\n\nExamples:\n\n- Docker verification is required, but the user says not to touch Docker: block the step.\n- Tests require credentials that are unavailable: block the step and explain what credentials are needed.\n- Deployment is required, but the user requested local-only work: block or ask the user to revise the step before marking it done.\n- Verification fails and the fix is known: move back to implementing, not blocked.\n- Verification fails because an external service is unavailable: block.\n- Optional future deployment is not required by acceptance criteria: document it as deferred; do not block only for optional work.\n\nUse step.transition to move the step to blocked with a note that explains what is blocked, why it is blocked, what input or permission is needed, and what should happen after the blocker is resolved. Use plan.block when execution cannot continue at plan level."
  },
  {
    uri: "steps://docs/flows/verification",
    name: "steps.docs.flows.verification",
    title: "Verification Flow",
    description: "Explains verification, rework, and completion.",
    mimeType: "text/markdown",
    text: "# Verification Flow\n\nA step should move to verification when implementation is ready. If verification passes and required acceptance criteria are satisfied, transition it to done. If verification fails but can be fixed, transition it back to implementing with a note explaining what remains. If verification cannot be performed or a required acceptance criterion is blocked by user instruction, missing access, external systems, safety constraints, or unapproved deployment/destructive work, transition it to blocked. Read steps://docs/flows/blocking for the full blocking checklist."
  },
  {
    uri: "steps://docs/flows/order",
    name: "steps.docs.flows.order",
    title: "Order Flow",
    description: "Explains ordered and independent step selection.",
    mimeType: "text/markdown",
    text: "# Order Flow\n\nOrdered steps use positive order indexes and must respect unfinished predecessors. Independent steps use order 0 and may be selected when no ordered dependency blocks execution."
  },
  {
    uri: "steps://docs/flows/next",
    name: "steps.docs.flows.next",
    title: "Next Step Flow",
    description: "Explains how to read and follow the server's next action.",
    mimeType: "text/markdown",
    text: "# Next Step Flow\n\nThe next resource explains what the server considers safe to do next. Agents should follow it during execution loops and stop when it reports completion, blocker, or required user input."
  }
];

export const resourceTemplates: ResourceTemplateDefinition[] = [
  {
    uriTemplate: "steps://plans/{planId}",
    name: "steps.plans.detail",
    title: "Plan",
    description: "Read a plan summary, counters, and related resource links.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://plans/{planId}/steps",
    name: "steps.plans.steps",
    title: "Plan Steps",
    description: "Read the steps that belong to a plan.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://plans/{planId}/next",
    name: "steps.plans.next",
    title: "Plan Next Step",
    description: "Read which step the server currently considers next for a plan.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://plans/{planId}/summary",
    name: "steps.plans.summary",
    title: "Plan Summary",
    description: "Read compact plan status, progress, active step, blockers, and next action.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://plans/{planId}/timeline",
    name: "steps.plans.timeline",
    title: "Plan Timeline",
    description: "Read a compact chronological timeline across a plan.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://steps/{stepId}",
    name: "steps.steps.detail",
    title: "Step",
    description: "Read a step's current state and related resource links.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://steps/{stepId}/history",
    name: "steps.steps.history",
    title: "Step History",
    description: "Read notes and transitions for a step.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://steps/{stepId}/notes",
    name: "steps.steps.notes",
    title: "Step Notes",
    description: "Read notes for a step.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://steps/{stepId}/transitions",
    name: "steps.steps.transitions",
    title: "Step Transitions",
    description: "Read transitions for a step.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://steps/{stepId}/attachments",
    name: "steps.steps.attachments",
    title: "Step Attachments",
    description: "Read attachments connected to a step.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://notes/{noteId}",
    name: "steps.notes.detail",
    title: "Note",
    description: "Read a note and related links.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://notes/{noteId}/attachments",
    name: "steps.notes.attachments",
    title: "Note Attachments",
    description: "Read attachments connected to a note.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://attachments/{attachmentId}",
    name: "steps.attachments.detail",
    title: "Attachment",
    description: "Read attachment metadata.",
    mimeType: "application/json"
  },
  {
    uriTemplate: "steps://attachments/{attachmentId}/content",
    name: "steps.attachments.content",
    title: "Attachment Content",
    description: "Read attachment content.",
    mimeType: "application/octet-stream"
  }
];
