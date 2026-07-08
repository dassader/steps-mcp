import type { SqliteDatabase } from "../../db/connection.js";
import { createResponse, type JsonRpcRequest } from "../jsonrpc.js";
import type { SessionManager } from "../session-manager.js";

export interface RouteContext {
  db: SqliteDatabase;
  publicUrl: string;
  sessionManager: SessionManager;
  sessionId?: string;
  abortSignal?: AbortSignal;
}

export interface RouteResult {
  status: number;
  sessionId?: string;
  body?: unknown;
}

export function ok(request: JsonRpcRequest, result: unknown): RouteResult {
  return {
    status: 200,
    body: createResponse(request.id, result)
  };
}

export function objectParams(params: unknown): Record<string, unknown> {
  return params && typeof params === "object" ? (params as Record<string, unknown>) : {};
}
