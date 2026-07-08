import { callTool } from "../../tools/call-router.js";
import { listTools } from "../../tools/list-handler.js";
import { createErrorResponse, createResponse, jsonRpcErrors, type JsonRpcRequest } from "../jsonrpc.js";
import { objectParams, ok, type RouteContext, type RouteResult } from "./shared.js";

export function listToolsRoute(request: JsonRpcRequest): RouteResult {
  return ok(request, { tools: listTools() });
}

export async function callToolRoute(request: JsonRpcRequest, context: RouteContext): Promise<RouteResult> {
  const params = objectParams(request.params);
  if (typeof params.name !== "string" || params.name.trim() === "") {
    return {
      status: 200,
      body: createErrorResponse(request.id, jsonRpcErrors.invalidParams, "Invalid params", {
        code: "TOOL_NAME_REQUIRED",
        reason: "tools/call requires params.name."
      })
    };
  }
  const result = await callTool(
    {
      name: params.name,
      arguments: params.arguments,
      _meta: params._meta
    },
    {
      db: context.db,
      publicUrl: context.publicUrl
    }
  );
  return {
    status: 200,
    body: createResponse(request.id, result)
  };
}
