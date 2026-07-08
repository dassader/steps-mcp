export function planContinueMessage(args: Record<string, string>): string {
  return `Resume the Steps MCP plan ${args.planId}.

Read steps://plans/${args.planId}/summary first to recover the plan status, active step, blockers, recent events, and nextAction. Do not choose the next step locally. Follow the returned nextAction. If nextAction or state means plan_not_approved, show links.reviewUrl from the summary or plan resource and wait for user approval. If the plan is paused or blocked, stop and explain the server state. If summary.activeStep exists, read that step and its history before continuing. If a todo step is available and execution has already been approved, call the recommended tool and continue while nextAction.shouldContinueRun is true and requiresUserInput is false. If ordered work is blocked, explain the blocker and recommend the safest next action. Optional deeper docs: steps://docs/flows/run and steps://docs/flows/next.`;
}
