import { toolDefinitions } from "./definitions/index.js";
import { emptyObjectSchema } from "./definitions/schema.js";
import type { JsonSchema } from "./definitions/schema.js";
import type { ToolDefinition } from "./definitions/types.js";

export type { ToolDefinition };

export function listTools(): ToolDefinition[] {
  return toolDefinitions;
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return toolDefinitions.find((tool) => tool.name === name);
}

export function getEmptyObjectSchema(): JsonSchema {
  return emptyObjectSchema;
}
