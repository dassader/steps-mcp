import type { StepStatus } from "../types";

export const boardColumns: Array<{ status: StepStatus; title: string }> = [
  { status: "todo", title: "Todo" },
  { status: "implementing", title: "Implementing" },
  { status: "verification", title: "Verification" },
  { status: "done", title: "Done" },
  { status: "blocked", title: "Blocked" }
];

export function getStatusTitle(status: StepStatus): string {
  return boardColumns.find((column) => column.status === status)?.title ?? status;
}

export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
