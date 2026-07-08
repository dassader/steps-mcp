import { PromptRequestError } from "../../prompts/errors.js";
import { getPrompt } from "../../prompts/get-handler.js";
import { listPrompts } from "../../prompts/list-handler.js";
import { createErrorResponse, jsonRpcErrors, type JsonRpcRequest } from "../jsonrpc.js";
import { objectParams, ok, type RouteResult } from "./shared.js";

export function listPromptsRoute(request: JsonRpcRequest): RouteResult {
  return ok(request, { prompts: listPrompts() });
}

export function getPromptRoute(request: JsonRpcRequest): RouteResult {
  const params = objectParams(request.params);
  if (typeof params.name !== "string" || params.name.trim() === "") {
    return {
      status: 200,
      body: createErrorResponse(request.id, jsonRpcErrors.invalidParams, "Invalid params", {
        code: "PROMPT_NAME_REQUIRED",
        reason: "prompts/get requires params.name."
      })
    };
  }
  try {
    return ok(request, getPrompt(params.name.trim(), params.arguments));
  } catch (error) {
    if (error instanceof PromptRequestError) {
      return {
        status: 200,
        body: createErrorResponse(request.id, jsonRpcErrors.invalidParams, "Invalid params", {
          code: error.code,
          reason: error.message,
          details: error.details
        })
      };
    }
    throw error;
  }
}
