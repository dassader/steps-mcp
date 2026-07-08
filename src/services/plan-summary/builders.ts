import type { PlanTimelineEventRecord } from "../../repositories/timeline.repository.js";
import { attachmentUri, noteUri, stepUri } from "../../resources/uris.js";
import type { PlanTimelineEvent } from "../../resources/views.js";
import { summarizeText } from "../../resources/summaries.js";

export function toPlanTimelineEvent(event: PlanTimelineEventRecord): PlanTimelineEvent {
  const base = {
    id: event.id,
    stepId: event.stepId,
    stepUri: stepUri(event.stepId),
    stepTitle: event.stepTitle,
    createdAt: event.createdAt
  };

  if (event.type === "transition") {
    return {
      ...base,
      type: "transition",
      uri: `${stepUri(event.stepId)}/transitions`,
      summary: `${event.fromStatus} -> ${event.toStatus}`,
      fromStatus: event.fromStatus ?? "todo",
      toStatus: event.toStatus ?? "todo",
      noteId: event.noteId ?? "",
      noteUri: noteUri(event.noteId ?? "")
    };
  }

  if (event.type === "attachment") {
    const name = event.attachmentName ?? "attachment";
    return {
      ...base,
      type: "attachment",
      uri: attachmentUri(event.id),
      summary: `Attachment added: ${name}`,
      noteId: event.noteId ?? "",
      noteUri: noteUri(event.noteId ?? ""),
      name,
      mimeType: event.mimeType ?? "application/octet-stream"
    };
  }

  return {
    ...base,
    type: "note",
    uri: noteUri(event.id),
    summary: summarizeText(event.noteText ?? "")
  };
}
