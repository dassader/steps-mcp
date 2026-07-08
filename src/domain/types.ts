export type PlanStatus = "draft" | "approved" | "executing" | "paused" | "completed" | "blocked";
export type StepStatus = "todo" | "implementing" | "verification" | "blocked" | "done";
export type Author = "human" | "agent";
export type AttachmentContentKind = "none" | "text" | "blob" | "link";

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  blockerReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  planId: string;
  title: string;
  description: string;
  order: number;
  status: StepStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  stepId: string;
  text: string;
  author: Author;
  createdAt: string;
}

export interface Transition {
  id: string;
  stepId: string;
  noteId: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  createdAt: string;
}

export interface Attachment {
  id: string;
  noteId: string;
  name: string;
  mimeType: string | null;
  size: number;
  contentKind: AttachmentContentKind;
  textContent: string | null;
  blobContent: Buffer | null;
  linkUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepCounts {
  total: number;
  todo: number;
  implementing: number;
  verification: number;
  blocked: number;
  done: number;
}

export interface IdempotencyRecord {
  id: string;
  scopeIdentity: string;
  toolName: string;
  targetEntityId: string | null;
  idempotencyKey: string;
  argumentsHash: string;
  resultJson: string;
  createdAt: string;
  expiresAt: string;
}
