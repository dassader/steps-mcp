export function stepSummarizeHistoryMessage(args: Record<string, string>): string {
  return `Summarize the history for step ${args.stepId}.

Read steps://steps/${args.stepId} and steps://steps/${args.stepId}/history. If plan-level context is needed, use the step's planId to read steps://plans/{planId}/timeline. Produce a concise summary of the original step goal, important notes, status transitions, attachments, current status, unresolved blockers, and the safest next action. Do not change state while summarizing.`;
}
