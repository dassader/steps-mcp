import { complete } from "../../completion/complete-handler.js";
import { CompletionRequestError } from "../../completion/errors.js";
import { createErrorResponse, jsonRpcErrors, type JsonRpcRequest } from "../jsonrpc.js";
import { objectParams, ok, type RouteContext, type RouteResult } from "./shared.js";

export function completeRoute(request: JsonRpcRequest, context: RouteContext): RouteResult {
  const params = objectParams(request.params);
  try {
    return ok(
      request,
      complete(
        {
          ref: params.ref,
          argument: params.argument,
          context: params.context
        },
        context.db
      )
    );
  } catch (error) {
    if (error instanceof CompletionRequestError) {
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
