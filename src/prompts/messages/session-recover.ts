export function sessionRecoverMessage(args: Record<string, string>): string {
  const preferred = args.preferredStatus ? `Preferred status: ${args.preferredStatus}\n\n` : "";
  return `${preferred}Recover Steps MCP work when no planId is known.

First call plan.list with hasActiveStep=true. If preferredStatus is provided, also use that status filter when it does not conflict with hasActiveStep. If no active plans are found, call plan.list with status=executing, then status=approved, then status=draft, using a small limit. Present a compact summary of matching plans to the user, including title, status, updatedAt, stepCounts, reviewUrl, and plan URI. Ask the user which plan to continue. Do not start execution until the user chooses a plan and approves continuation. Once a planId is chosen, use the plan.continue prompt for normal recovery, or plan.execute if the user explicitly approved execution. Read steps://docs/flows/execution only if you need more detail.`;
}
