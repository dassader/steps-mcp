export function planUri(planId: string): string {
  return `steps://plans/${planId}`;
}

export function planStepsUri(planId: string): string {
  return `${planUri(planId)}/steps`;
}

export function planNextUri(planId: string): string {
  return `${planUri(planId)}/next`;
}

export function planSummaryUri(planId: string): string {
  return `${planUri(planId)}/summary`;
}

export function planTimelineUri(planId: string): string {
  return `${planUri(planId)}/timeline`;
}

export function stepUri(stepId: string): string {
  return `steps://steps/${stepId}`;
}

export function stepHistoryUri(stepId: string): string {
  return `${stepUri(stepId)}/history`;
}

export function stepNotesUri(stepId: string): string {
  return `${stepUri(stepId)}/notes`;
}

export function stepTransitionsUri(stepId: string): string {
  return `${stepUri(stepId)}/transitions`;
}

export function stepAttachmentsUri(stepId: string): string {
  return `${stepUri(stepId)}/attachments`;
}

export function noteUri(noteId: string): string {
  return `steps://notes/${noteId}`;
}

export function noteAttachmentsUri(noteId: string): string {
  return `${noteUri(noteId)}/attachments`;
}

export function attachmentUri(attachmentId: string): string {
  return `steps://attachments/${attachmentId}`;
}

export function attachmentContentUri(attachmentId: string): string {
  return `${attachmentUri(attachmentId)}/content`;
}

export function planResourceLinks(planId: string) {
  return {
    planUri: planUri(planId),
    stepsUri: planStepsUri(planId),
    nextUri: planNextUri(planId),
    summaryUri: planSummaryUri(planId),
    timelineUri: planTimelineUri(planId)
  };
}

export function userFacingLinks(publicUrl: string, planId: string) {
  return {
    reviewUrl: `${normalizePublicUrl(publicUrl)}/plans/${encodeURIComponent(planId)}`
  };
}

function normalizePublicUrl(publicUrl: string): string {
  return publicUrl.trim().replace(/\/+$/, "");
}
