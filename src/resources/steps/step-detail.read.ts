import type { SqliteDatabase } from "../../db/connection.js";
import { getAllowedTransitions } from "../../utils/step-status.js";
import {
  planUri,
  stepAttachmentsUri,
  stepHistoryUri,
  stepNotesUri,
  stepTransitionsUri,
  stepUri
} from "../uris.js";
import type { StepView } from "../views.js";
import { requireStep } from "./step-utils.js";

export function readStepDetail(db: SqliteDatabase, stepId: string): StepView {
  const step = requireStep(db, stepId);
  return {
    resourceType: "step",
    uri: stepUri(step.id),
    id: step.id,
    planId: step.planId,
    planUri: planUri(step.planId),
    title: step.title,
    description: step.description,
    order: step.order,
    status: step.status,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt,
    allowedTransitions: getAllowedTransitions(step.status),
    historyUri: stepHistoryUri(step.id),
    notesUri: stepNotesUri(step.id),
    transitionsUri: stepTransitionsUri(step.id),
    attachmentsUri: stepAttachmentsUri(step.id)
  };
}
