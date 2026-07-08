import type { SqliteDatabase } from "../db/connection.js";
import type { ToolSuccess } from "./tool-result.js";

export interface ToolCallContext {
  db: SqliteDatabase;
  publicUrl: string;
  scopeIdentity?: string;
}

export interface ToolCallRequest {
  name: string;
  arguments?: unknown;
  _meta?: unknown;
}

export type ToolHandler = (args: Record<string, unknown>, context: ToolCallContext) => Promise<ToolSuccess> | ToolSuccess;
