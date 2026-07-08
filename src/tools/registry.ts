import { toolRegistrations } from "./definitions/index.js";
import type { ToolHandler } from "./types.js";

const toolHandlers = new Map<string, ToolHandler>(
  toolRegistrations.map((tool) => [tool.name, tool.handler])
);

export function registerToolHandler(name: string, handler: ToolHandler): void {
  toolHandlers.set(name, handler);
}

export function getToolHandler(name: string): ToolHandler | undefined {
  return toolHandlers.get(name);
}
