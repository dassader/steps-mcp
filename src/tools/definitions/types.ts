import type { ToolHandler } from "../types.js";
import type { JsonSchema } from "./schema.js";

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface ToolRegistration extends ToolDefinition {
  handler: ToolHandler;
}
