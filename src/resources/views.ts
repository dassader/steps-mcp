import type { Author, PlanStatus, StepCounts, StepStatus } from "../domain/types.js";

export type NextActionKind = "call_tool" | "read_resource" | "stop";
export type NextStepState =
  | "active_step"
  | "step_available"
  | "plan_not_approved"
  | "plan_paused"
  | "plan_blocked"
  | "ordered_chain_blocked"
  | "no_executable_steps"
  | "all_steps_done";

export interface NextAction {
  kind: NextActionKind;
  tool: string | null;
  resource: string | null;
  reason: string;
  requiresUserInput: boolean;
  shouldContinueRun: boolean;
}

export interface UserFacingLinks {
  reviewUrl: string;
}

export interface ResourceLinks {
  [name: string]: string | null;
}

export interface StepSummary {
  id: string;
  uri: string;
  title: string;
  description: string;
  order: number;
  status: StepStatus;
  updatedAt: string;
  historyUri: string;
  notesUri: string;
  transitionsUri: string;
  attachmentsUri: string;
}

export interface BlockedByStep {
  stepId: string;
  stepUri: string;
  title: string;
  order: number;
  status: StepStatus;
  message: string;
}

export interface PlanNextStepView {
  resourceType: "plan_next_step";
  uri: string;
  planId: string;
  planUri: string;
  planStatus: PlanStatus;
  links: UserFacingLinks;
  state: NextStepState;
  message: string;
  selectedStep: StepSummary | null;
  blockedBy: BlockedByStep | null;
  nextAction: NextAction;
}

export interface PlanSummaryPlan {
  id: string;
  uri: string;
  title: string;
  status: PlanStatus;
  stepCounts: StepCounts;
  links: UserFacingLinks;
}

export interface PlanTimelineBaseEvent {
  type: "note" | "transition" | "attachment";
  id: string;
  uri: string;
  stepId: string;
  stepUri: string;
  stepTitle: string;
  createdAt: string;
  summary: string;
}

export interface PlanTimelineNoteEvent extends PlanTimelineBaseEvent {
  type: "note";
}

export interface PlanTimelineTransitionEvent extends PlanTimelineBaseEvent {
  type: "transition";
  fromStatus: StepStatus;
  toStatus: StepStatus;
  noteId: string;
  noteUri: string;
}

export interface PlanTimelineAttachmentEvent extends PlanTimelineBaseEvent {
  type: "attachment";
  noteId: string;
  noteUri: string;
  name: string;
  mimeType: string;
}

export type PlanTimelineEvent = PlanTimelineNoteEvent | PlanTimelineTransitionEvent | PlanTimelineAttachmentEvent;

export interface PlanSummaryView {
  resourceType: "plan_summary";
  uri: string;
  planId: string;
  planUri: string;
  title: string;
  status: PlanStatus;
  stepCounts: StepCounts;
  nextUri: string;
  message: string;
  links: UserFacingLinks;
  plan: PlanSummaryPlan;
  activeStep: StepSummary | null;
  nextAction: NextAction;
  blockedSteps: StepSummary[];
  recentEvents: PlanTimelineEvent[];
  resources: ResourceLinks;
}

export interface PlanTimelineView {
  resourceType: "plan_timeline";
  uri: string;
  planId: string;
  planUri: string;
  planStatus: PlanStatus;
  links: UserFacingLinks;
  events: PlanTimelineEvent[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface StepView {
  resourceType: "step";
  uri: string;
  id: string;
  planId: string;
  planUri: string;
  title: string;
  description: string;
  order: number;
  status: StepStatus;
  createdAt: string;
  updatedAt: string;
  allowedTransitions: StepStatus[];
  historyUri: string;
  notesUri: string;
  transitionsUri: string;
  attachmentsUri: string;
}

export interface HistoryNoteEvent {
  type: "note";
  id: string;
  uri: string;
  createdAt: string;
  summary: string;
}

export interface HistoryTransitionEvent {
  type: "transition";
  id: string;
  uri: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  noteId: string;
  noteUri: string;
  createdAt: string;
}

export interface HistoryAttachmentEvent {
  type: "attachment";
  id: string;
  uri: string;
  noteId: string;
  noteUri: string;
  name: string;
  mimeType: string;
  createdAt: string;
}

export type HistoryEvent = HistoryNoteEvent | HistoryTransitionEvent | HistoryAttachmentEvent;

export interface StepHistoryView {
  resourceType: "step_history";
  uri: string;
  stepId: string;
  stepUri: string;
  notes: HistoryNoteEvent[];
  transitions: HistoryTransitionEvent[];
  attachments: HistoryAttachmentEvent[];
  events: HistoryEvent[];
}

export interface NoteSummary {
  id: string;
  uri: string;
  author: Author;
  createdAt: string;
  summary: string;
  attachmentsUri: string;
}

export interface StepNotesView {
  resourceType: "step_notes";
  uri: string;
  stepId: string;
  stepUri: string;
  notes: NoteSummary[];
}

export interface TransitionView {
  id: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  noteId: string;
  noteUri: string;
  createdAt: string;
}

export interface StepTransitionsView {
  resourceType: "step_transitions";
  uri: string;
  stepId: string;
  stepUri: string;
  transitions: TransitionView[];
}

export interface AttachmentSummary {
  id: string;
  uri: string;
  noteId: string;
  noteUri: string;
  name: string;
  mimeType: string;
  size: number;
  linkUri: string | null;
  contentUri: string | null;
  createdAt: string;
}

export interface AttachmentView {
  resourceType: "attachment";
  uri: string;
  id: string;
  noteId: string;
  noteUri: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  linkUri: string | null;
  contentAvailable: boolean;
  contentUri: string | null;
}

export interface StepAttachmentsView {
  resourceType: "step_attachments";
  uri: string;
  stepId: string;
  stepUri: string;
  attachments: AttachmentSummary[];
}

export interface NoteView {
  resourceType: "note";
  uri: string;
  id: string;
  stepId: string;
  stepUri: string;
  text: string;
  author: Author;
  createdAt: string;
  attachmentsUri: string;
}

export interface NoteAttachmentsView {
  resourceType: "note_attachments";
  uri: string;
  noteId: string;
  noteUri: string;
  attachments: AttachmentSummary[];
}
