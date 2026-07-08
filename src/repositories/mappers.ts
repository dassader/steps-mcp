import type {
  Attachment,
  AttachmentContentKind,
  Author,
  IdempotencyRecord,
  Note,
  Plan,
  PlanStatus,
  Step,
  StepStatus,
  Transition
} from "../domain/types.js";

export interface PlanRow {
  id: string;
  title: string;
  status: PlanStatus;
  blocker_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface StepRow {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  order_index: number;
  status: StepStatus;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  step_id: string;
  text: string;
  author: Author;
  created_at: string;
}

export interface TransitionRow {
  id: string;
  step_id: string;
  note_id: string;
  from_status: StepStatus;
  to_status: StepStatus;
  created_at: string;
}

export interface AttachmentRow {
  id: string;
  note_id: string;
  name: string;
  mime_type: string | null;
  size: number;
  content_kind: AttachmentContentKind;
  text_content: string | null;
  blob_content: Buffer | null;
  link_uri: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdempotencyRow {
  id: string;
  scope_identity: string;
  tool_name: string;
  target_entity_id: string | null;
  idempotency_key: string;
  arguments_hash: string;
  result_json: string;
  created_at: string;
  expires_at: string;
}

export function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    blockerReason: row.blocker_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapStep(row: StepRow): Step {
  return {
    id: row.id,
    planId: row.plan_id,
    title: row.title,
    description: row.description,
    order: row.order_index,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    stepId: row.step_id,
    text: row.text,
    author: row.author,
    createdAt: row.created_at
  };
}

export function mapTransition(row: TransitionRow): Transition {
  return {
    id: row.id,
    stepId: row.step_id,
    noteId: row.note_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    createdAt: row.created_at
  };
}

export function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    noteId: row.note_id,
    name: row.name,
    mimeType: row.mime_type,
    size: row.size,
    contentKind: row.content_kind,
    textContent: row.text_content,
    blobContent: row.blob_content,
    linkUri: row.link_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapIdempotency(row: IdempotencyRow): IdempotencyRecord {
  return {
    id: row.id,
    scopeIdentity: row.scope_identity,
    toolName: row.tool_name,
    targetEntityId: row.target_entity_id,
    idempotencyKey: row.idempotency_key,
    argumentsHash: row.arguments_hash,
    resultJson: row.result_json,
    createdAt: row.created_at,
    expiresAt: row.expires_at
  };
}
