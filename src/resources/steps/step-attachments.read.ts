import type { SqliteDatabase } from "../../db/connection.js";
import { findAttachmentsByStepId } from "../../repositories/attachment.repository.js";
import { toAttachmentSummary } from "../attachment-views.js";
import { stepAttachmentsUri, stepUri } from "../uris.js";
import type { StepAttachmentsView } from "../views.js";
import { requireStep } from "./step-utils.js";

export function readStepAttachments(db: SqliteDatabase, stepId: string): StepAttachmentsView {
  const step = requireStep(db, stepId);
  return {
    resourceType: "step_attachments",
    uri: stepAttachmentsUri(step.id),
    stepId: step.id,
    stepUri: stepUri(step.id),
    attachments: findAttachmentsByStepId(db, step.id).map(toAttachmentSummary)
  };
}
