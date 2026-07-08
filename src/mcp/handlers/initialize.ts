import { createErrorResponse, createResponse, jsonRpcErrors, type JsonRpcRequest } from "../jsonrpc.js";
import { objectParams, type RouteContext, type RouteResult } from "./shared.js";

export const supportedProtocolVersion = "2025-11-25";

export function createInitializeResult(requestedProtocolVersion: unknown) {
  return {
    protocolVersion: typeof requestedProtocolVersion === "string" ? requestedProtocolVersion : supportedProtocolVersion,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
      completions: {}
    },
    serverInfo: {
      name: "steps-mcp",
      title: "Steps MCP",
      description: "Agent-friendly task planning and execution MCP server.",
      version: "0.1.0"
    },
    instructions:
      "Start by reading steps://docs/overview. For new work, use the prompt plan.break_down, create a reviewable plan, show the returned review URL, and wait for approval before execution."
  };
}

export function initializeRoute(request: JsonRpcRequest, context: RouteContext): RouteResult {
  const session = context.sessionManager.createSession();
  const params = objectParams(request.params);
  return {
    status: 200,
    sessionId: session.id,
    body: createResponse(request.id, createInitializeResult(params.protocolVersion))
  };
}

export function initializedRoute(request: JsonRpcRequest, context: RouteContext): RouteResult {
  if (!context.sessionId || !context.sessionManager.markInitialized(context.sessionId)) {
    return {
      status: 200,
      body: createErrorResponse(request.id, jsonRpcErrors.serverNotInitialized, "Server not initialized", {
        code: "SERVER_NOT_INITIALIZED",
        reason: "Missing or invalid MCP-Session-Id."
      })
    };
  }
  return { status: 202 };
}

export function cancelledRoute(request: JsonRpcRequest, context: RouteContext): RouteResult {
  const params = objectParams(request.params);
  context.sessionManager.cancelRequest(context.sessionId, params.requestId);
  return { status: 202 };
}
