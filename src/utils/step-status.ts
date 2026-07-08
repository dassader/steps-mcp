import type { StepStatus } from "../domain/types.js";

const allowedTransitions: Record<StepStatus, readonly StepStatus[]> = {
  todo: ["implementing", "blocked"],
  implementing: ["verification", "blocked"],
  verification: ["done", "implementing", "blocked"],
  blocked: ["todo", "implementing", "verification"],
  done: ["todo", "verification", "implementing"]
};

export function getAllowedTransitions(fromStatus: StepStatus): StepStatus[] {
  return [...allowedTransitions[fromStatus]];
}

export function isTransitionAllowed(fromStatus: StepStatus, toStatus: StepStatus): boolean {
  return allowedTransitions[fromStatus].includes(toStatus);
}
