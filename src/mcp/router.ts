import { completeRoute } from "./handlers/completion.js";
import { cancelledRoute, initializedRoute, initializeRoute } from "./handlers/initialize.js";
import { createPingResult } from "./handlers/ping.js";
import { getPromptRoute, listPromptsRoute } from "./handlers/prompts.js";
import { listResourcesRoute, listResourceTemplatesRoute, readResourceRoute } from "./handlers/resources.js";
import { ok, type RouteContext, type RouteResult } from "./handlers/shared.js";
import { callToolRoute, listToolsRoute } from "./handlers/tools.js";
import { createErrorResponse, jsonRpcErrors, type JsonRpcRequest } from "./jsonrpc.js";

export type { RouteContext, RouteResult } from "./handlers/shared.js";

const methodsAllowedBeforeInitialized = new Set(["initialize", "notifications/initialized", "ping"]);

export async function routeJsonRpc(request: JsonRpcRequest, context: RouteContext): Promise<RouteResult> {
  if (!methodsAllowedBeforeInitialized.has(request.method) && !context.sessionManager.ensureInitialized(context.sessionId)) {
    return {
      status: 200,
      body: createErrorResponse(request.id, jsonRpcErrors.serverNotInitialized, "Server not initialized", {
        code: "SERVER_NOT_INITIALIZED",
        reason: "Call initialize, keep the returned MCP-Session-Id header, then send notifications/initialized with that header before using MCP methods.",
        retryable: true,
        requiredMethods: ["initialize", "notifications/initialized"],
        requiredHeader: "MCP-Session-Id"
      })
    };
  }

  switch (request.method) {
    case "initialize":
      return initializeRoute(request, context);
    case "notifications/initialized":
      return initializedRoute(request, context);
    case "notifications/cancelled":
      return cancelledRoute(request, context);
    case "tools/list":
      return listToolsRoute(request);
    case "tools/call":
      return callToolRoute(request, context);
    case "resources/list":
      return listResourcesRoute(request);
    case "resources/templates/list":
      return listResourceTemplatesRoute(request);
    case "resources/read":
      return readResourceRoute(request, context);
    case "prompts/list":
      return listPromptsRoute(request);
    case "prompts/get":
      return getPromptRoute(request);
    case "completion/complete":
      return completeRoute(request, context);
    case "ping":
      return ok(request, createPingResult());
    default:
      return {
        status: 200,
        body: createErrorResponse(request.id, jsonRpcErrors.methodNotFound, "Method not found", {
          method: request.method
        })
      };
  }
}
