import type { StepStatus } from "../types";
import { getStatusTitle } from "./status";

const allowedTransitions: Record<StepStatus, readonly StepStatus[]> = {
  todo: ["implementing", "blocked"],
  implementing: ["verification", "blocked"],
  verification: ["done", "implementing", "blocked"],
  blocked: ["todo", "implementing", "verification"],
  done: ["todo", "verification", "implementing"]
};

export function isStepTransitionAllowed(fromStatus: StepStatus, toStatus: StepStatus): boolean {
  return allowedTransitions[fromStatus].includes(toStatus);
}

export function unavailableTransitionMessage(fromStatus: StepStatus, toStatus: StepStatus): string {
  const allowedLabels = allowedTransitions[fromStatus].map(getStatusTitle).join(", ");

  return `Move from ${getStatusTitle(fromStatus)} to ${getStatusTitle(toStatus)} is not available. Available moves: ${allowedLabels}.`;
}
