import { callMcpTool, readMcpAttachmentContent, readMcpJsonResource } from "./mcpClient";
import type { Plan, PlanState, Step, StepAttachment, StepNote, StepStatus, StepTransition } from "./types";

interface ApiRequestOptions {
  signal?: AbortSignal;
}

interface ToolSuccess<TState = Record<string, unknown>> {
  ok: true;
  state: TState;
}

interface PlanListState {
  plans: McpPlanSummary[];
}

interface McpPlanSummary {
  id: string;
  title: string;
  status: Plan["status"];
  blockerReason?: string | null;
  stepCounts: Plan["stepCounts"];
  createdAt?: string;
  updatedAt: string;
}

interface PlanCreateState {
  planId: string;
}

interface StepCreateState {
  stepId: string;
}

interface PlanDetailResource {
  id: string;
  title: string;
  status: Plan["status"];
  blockerReason?: string | null;
  createdAt: string;
  updatedAt: string;
  stepCounts: PlanState["stepCounts"];
}

interface PlanStepsResource {
  steps: Array<{ id: string }>;
}

interface StepDetailResource {
  id: string;
  planId: string;
  title: string;
  description: string;
  order: number;
  status: StepStatus;
  createdAt: string;
  updatedAt: string;
}

interface StepNotesResource {
  notes: Array<{ id: string; createdAt: string }>;
}

interface NoteResource {
  id: string;
  stepId: string;
  text: string;
  author: StepNote["author"];
  createdAt: string;
}

interface NoteAttachmentsResource {
  attachments: AttachmentSummaryResource[];
}

interface AttachmentSummaryResource {
  id: string;
  noteId: string;
  name: string;
  mimeType: string | null;
  size: number;
  linkUri: string | null;
  contentUri: string | null;
  createdAt: string;
}

interface AttachmentResource extends AttachmentSummaryResource {
  contentAvailable: boolean;
}

interface StepTransitionsResource {
  transitions: Array<{
    id: string;
    fromStatus: StepStatus;
    toStatus: StepStatus;
    noteId: string;
    createdAt: string;
  }>;
}

export async function listPlans(options: ApiRequestOptions = {}): Promise<Plan[]> {
  const result = await callMcpTool<ToolSuccess<PlanListState>>("plan.list", { limit: 50 }, { signal: options.signal });
  return result.state.plans.map(toPlan);
}

export async function createPlan(input: { title: string }): Promise<Plan> {
  const result = await callMcpTool<ToolSuccess<PlanCreateState>>("plan.create", input);
  return readPlan(result.state.planId);
}

export async function getPlanState(planId: string, options: ApiRequestOptions = {}): Promise<PlanState> {
  const [plan, planSteps] = await Promise.all([
    readMcpJsonResource<PlanDetailResource>(`steps://plans/${planId}`, { signal: options.signal }),
    readMcpJsonResource<PlanStepsResource>(`steps://plans/${planId}/steps`, { signal: options.signal })
  ]);
  const noteCache = new Map<string, Promise<NoteResource>>();
  const steps = await Promise.all(planSteps.steps.map((step) => readStepState(step.id, noteCache, options)));

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      blockerReason: plan.blockerReason ?? null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    },
    stepCounts: plan.stepCounts,
    steps
  };
}

export async function createStep(planId: string, input: { title: string; description: string }): Promise<Step> {
  const state = await getPlanState(planId);
  const order = Math.max(0, ...state.steps.map((step) => step.order)) + 1;
  const result = await callMcpTool<ToolSuccess<StepCreateState>>("step.create", {
    planId,
    title: input.title,
    description: input.description,
    order
  });
  return readStep(result.state.stepId);
}

export async function approvePlan(planId: string): Promise<PlanState> {
  await callMcpTool("plan.approve", {
    planId,
    approvalEvidence: "Approved from the Steps UI."
  });
  return getPlanState(planId);
}

export async function updateStep(stepId: string, input: { title: string; description: string }): Promise<Step> {
  await callMcpTool("step.update", {
    stepId,
    title: input.title,
    description: input.description
  });
  return readStep(stepId);
}

export async function deleteStep(stepId: string): Promise<void> {
  await callMcpTool("step.delete", {
    stepId,
    confirmDeleteRelatedData: true
  });
}

export async function transitionStep(stepId: string, input: { toStatus: StepStatus; noteText: string }): Promise<void> {
  const step = await readStep(stepId);
  await callMcpTool("step.transition", {
    stepId,
    fromStatus: step.status,
    toStatus: input.toStatus,
    noteText: input.noteText,
    author: "human"
  });
}

export async function downloadAttachment(attachment: StepAttachment): Promise<void> {
  if (attachment.contentKind === "link" && attachment.linkUri) {
    window.open(attachment.linkUri, "_blank", "noopener,noreferrer");
    return;
  }

  const meta = await readMcpJsonResource<AttachmentResource>(`steps://attachments/${attachment.id}`);
  if (!meta.contentUri) {
    throw new Error("Attachment content is not available.");
  }

  const content = await readMcpAttachmentContent(meta.contentUri);
  const bytes = content.blob ? base64ToBytes(content.blob) : new TextEncoder().encode(content.text ?? "");
  const objectUrl = URL.createObjectURL(new Blob([toArrayBuffer(bytes)], { type: content.mimeType }));

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = attachment.name;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function readPlan(planId: string): Promise<Plan> {
  return toPlan(await readMcpJsonResource<PlanDetailResource>(`steps://plans/${planId}`));
}

async function readStep(stepId: string): Promise<Step> {
  const noteCache = new Map<string, Promise<NoteResource>>();
  return readStepState(stepId, noteCache);
}

async function readStepState(
  stepId: string,
  noteCache: Map<string, Promise<NoteResource>>,
  options: ApiRequestOptions = {}
): Promise<Step> {
  const [step, notesView, transitionsView] = await Promise.all([
    readMcpJsonResource<StepDetailResource>(`steps://steps/${stepId}`, { signal: options.signal }),
    readMcpJsonResource<StepNotesResource>(`steps://steps/${stepId}/notes`, { signal: options.signal }),
    readMcpJsonResource<StepTransitionsResource>(`steps://steps/${stepId}/transitions`, { signal: options.signal })
  ]);
  const [notes, transitions] = await Promise.all([
    Promise.all(notesView.notes.map((note) => readNoteState(note.id, noteCache, options))),
    Promise.all(transitionsView.transitions.map((transition) => readTransitionState(transition, noteCache, options)))
  ]);

  return {
    ...step,
    notes,
    transitions
  };
}

async function readNoteState(
  noteId: string,
  noteCache: Map<string, Promise<NoteResource>>,
  options: ApiRequestOptions
): Promise<StepNote> {
  const [note, attachmentsView] = await Promise.all([
    readNote(noteId, noteCache, options),
    readMcpJsonResource<NoteAttachmentsResource>(`steps://notes/${noteId}/attachments`, { signal: options.signal })
  ]);

  return {
    id: note.id,
    text: note.text,
    author: note.author,
    createdAt: note.createdAt,
    attachments: attachmentsView.attachments.map(toStepAttachment)
  };
}

async function readTransitionState(
  transition: StepTransitionsResource["transitions"][number],
  noteCache: Map<string, Promise<NoteResource>>,
  options: ApiRequestOptions
): Promise<StepTransition> {
  const note = await readNote(transition.noteId, noteCache, options);

  return {
    id: transition.id,
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    noteText: note.text,
    noteId: transition.noteId,
    createdAt: transition.createdAt
  };
}

function readNote(noteId: string, noteCache: Map<string, Promise<NoteResource>>, options: ApiRequestOptions): Promise<NoteResource> {
  const cached = noteCache.get(noteId);
  if (cached) {
    return cached;
  }

  const request = readMcpJsonResource<NoteResource>(`steps://notes/${noteId}`, { signal: options.signal });
  noteCache.set(noteId, request);
  return request;
}

function toStepAttachment(attachment: AttachmentSummaryResource): StepAttachment {
  return {
    id: attachment.id,
    noteId: attachment.noteId,
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
    contentKind: getAttachmentContentKind(attachment),
    linkUri: attachment.linkUri,
    createdAt: attachment.createdAt,
    updatedAt: attachment.createdAt
  };
}

function getAttachmentContentKind(attachment: AttachmentSummaryResource): StepAttachment["contentKind"] {
  if (attachment.linkUri) {
    return "link";
  }
  if (attachment.contentUri) {
    return "blob";
  }
  return "none";
}

function toPlan(plan: McpPlanSummary | PlanDetailResource): Plan {
  const stepCounts = plan.stepCounts;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    blockerReason: plan.blockerReason ?? null,
    createdAt: plan.createdAt ?? plan.updatedAt,
    updatedAt: plan.updatedAt,
    stepCounts: {
      total: stepCounts.total,
      done: stepCounts.done
    }
  };
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
