export function transitionPrepareNoteMessage(args: Record<string, string>): string {
  return `Prepare transition note text for step ${args.stepId}.

Target status: ${args.toStatus}
Reason: ${args.reason}

Read steps://steps/${args.stepId} and, if needed, steps://steps/${args.stepId}/history. If the target status is blocked, also read steps://docs/flows/blocking. Write concise markdown note text that explains why the transition is valid, what changed, what evidence exists, and what should happen next. Do not call step.transition until the current status and allowed transition are clear.`;
}
