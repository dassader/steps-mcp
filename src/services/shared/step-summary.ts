import type { Step } from "../../domain/types.js";
import {
  stepAttachmentsUri,
  stepHistoryUri,
  stepNotesUri,
  stepTransitionsUri,
  stepUri
} from "../../resources/uris.js";
import type { StepSummary } from "../../resources/views.js";

export function toStepSummary(step: Step): StepSummary {
  return {
    id: step.id,
    uri: stepUri(step.id),
    title: step.title,
    description: step.description,
    order: step.order,
    status: step.status,
    updatedAt: step.updatedAt,
    historyUri: stepHistoryUri(step.id),
    notesUri: stepNotesUri(step.id),
    transitionsUri: stepTransitionsUri(step.id),
    attachmentsUri: stepAttachmentsUri(step.id)
  };
}
