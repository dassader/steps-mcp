import type express from "express";

import type { SqliteDatabase } from "../db/connection.js";
import { closeSseStream, openSseStream } from "../transport/sse.js";
import { createErrorResponse, jsonRpcErrors, parseJsonRpcRequest, type JsonRpcRequest } from "./jsonrpc.js";
import { routeJsonRpc } from "./router.js";
import { SessionManager } from "./session-manager.js";

export interface McpHttpHandlerOptions {
  db: SqliteDatabase;
  publicUrl: string;
}

export function createMcpHttpHandler(options: McpHttpHandlerOptions): express.RequestHandler {
  const sessionManager = new SessionManager();

  return async (req, res, next) => {
    try {
      if (req.method === "GET") {
        if (!req.accepts("text/event-stream")) {
          res.status(406).json({ ok: false, message: "GET /mcp requires Accept: text/event-stream." });
          return;
        }
        const sessionId = req.get("MCP-Session-Id");
        if (!sessionManager.ensureInitialized(sessionId)) {
          res.status(400).json(
            createErrorResponse(null, jsonRpcErrors.serverNotInitialized, "Server not initialized", {
              code: "SERVER_NOT_INITIALIZED",
              reason: "Open the SSE stream with an initialized MCP-Session-Id."
            })
          );
          return;
        }
        openSseStream(sessionId as string, res);
        req.on("close", () => closeSseStream(sessionId as string, res));
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ ok: false, message: "Method not allowed." });
        return;
      }

      const parsed = parseJsonRpcRequest(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
      if ("error" in parsed) {
        res.status(400).json(parsed.error);
        return;
      }

      const abortController = new AbortController();
      const rawSessionId = req.get("MCP-Session-Id");
      let sessionId = rawSessionId;
      const autoSession = shouldAutoInitializeSession(parsed.method, rawSessionId)
        ? sessionManager.createInitializedSession()
        : null;
      if (autoSession) {
        sessionId = autoSession.id;
      }
      const registeredRequest = parsed.method !== "initialize" && parsed.method !== "notifications/cancelled"
        ? sessionManager.registerRequest(sessionId, parsed.id, abortController)
        : false;
      const progressToken = readProgressToken(parsed);
      if (progressToken && req.accepts("text/event-stream")) {
        res.status(200);
        if (autoSession) {
          res.setHeader("MCP-Session-Id", autoSession.id);
        }
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();
        writeProgress(res, progressToken, 0, "Request started.");
        const result = await routeWithAbortCleanup(parsed, {
          db: options.db,
          publicUrl: options.publicUrl,
          sessionManager,
          sessionId,
          abortSignal: abortController.signal
        }, registeredRequest);
        writeProgress(res, progressToken, 100, "Request completed.");
        if (result.body !== undefined) {
          writeSseData(res, result.body);
        }
        res.end();
        return;
      }

      const result = await routeWithAbortCleanup(parsed, {
        db: options.db,
        publicUrl: options.publicUrl,
        sessionManager,
        sessionId,
        abortSignal: abortController.signal
      }, registeredRequest);
      const responseSessionId = result.sessionId ?? autoSession?.id;
      if (responseSessionId) {
        res.setHeader("MCP-Session-Id", responseSessionId);
      }
      res.status(result.status);
      if (result.body === undefined) {
        res.end();
        return;
      }
      res.json(result.body);
    } catch (error) {
      next(error);
    }
  };
}

function shouldAutoInitializeSession(method: string, sessionId: string | undefined): boolean {
  if (sessionId !== undefined) return false;
  return method !== "initialize"
    && method !== "notifications/initialized"
    && method !== "notifications/cancelled"
    && method !== "ping";
}

async function routeWithAbortCleanup(
  request: JsonRpcRequest,
  context: Parameters<typeof routeJsonRpc>[1],
  registeredRequest: boolean
) {
  try {
    return await routeJsonRpc(request, context);
  } finally {
    if (registeredRequest) {
      context.sessionManager.finishRequest(context.sessionId, request.id);
    }
  }
}

function readProgressToken(request: ReturnType<typeof parseJsonRpcRequest>): string | null {
  if ("error" in request || request.method !== "tools/call") return null;
  const params = request.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) return null;
  const meta = (params as Record<string, unknown>)._meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const token = (meta as Record<string, unknown>).progressToken;
  return typeof token === "string" && token.trim() !== "" ? token : null;
}

function writeProgress(res: express.Response, progressToken: string, progress: number, message: string): void {
  writeSseData(res, {
    jsonrpc: "2.0",
    method: "notifications/progress",
    params: {
      progressToken,
      progress,
      total: 100,
      message
    }
  });
}

function writeSseData(res: express.Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
