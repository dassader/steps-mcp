export function stepExplainBlockerMessage(args: Record<string, string>): string {
  return `Prepare a blocker explanation for step ${args.stepId}.

Blocker:
${args.blocker}

Read steps://steps/${args.stepId}, steps://steps/${args.stepId}/history, and steps://docs/flows/blocking. Write note text that explains what is blocked, why it is blocked, what information or action is needed, and what should happen after the blocker is resolved. Then call step.transition to move the step to blocked if the current status allows it.`;
}
