export type PlanStatus = "draft" | "approved" | "executing" | "paused" | "completed" | "blocked";
export type StepStatus = "todo" | "implementing" | "verification" | "blocked" | "done";

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  blockerReason: string | null;
  createdAt: string;
  updatedAt: string;
  stepCounts: {
    total: number;
    done: number;
  };
}

export interface StepNote {
  id: string;
  text: string;
  author: "human" | "agent";
  createdAt: string;
  attachments: StepAttachment[];
}

export interface StepAttachment {
  id: string;
  noteId: string;
  name: string;
  mimeType: string | null;
  size: number;
  contentKind: "none" | "text" | "blob" | "link";
  linkUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepTransition {
  id: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  noteText: string;
  noteId: string;
  createdAt: string;
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
  notes: StepNote[];
  transitions: StepTransition[];
}

export interface PlanState {
  plan: Omit<Plan, "stepCounts">;
  stepCounts: {
    total: number;
    todo: number;
    implementing: number;
    verification: number;
    blocked: number;
    done: number;
  };
  steps: Step[];
}

export interface MoveDraft {
  stepId: string;
  nextStatus: StepStatus;
  note: string;
}

export type ApproveIntent = { kind: "manual" } | { kind: "move"; moveDraft: MoveDraft };

export interface StepFormDraft {
  id?: string;
  title: string;
  description: string;
}
