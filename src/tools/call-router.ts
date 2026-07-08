import { findIdempotencyRecord } from "../repositories/idempotency.repository.js";
import { validateToolInput } from "../utils/validation.js";
import { getIdempotency, storeIdempotentResult } from "./idempotency.js";
import { getToolDefinition } from "./list-handler.js";
import { getToolHandler } from "./registry.js";
import { ToolError, invalidRequest, toolNotFound, toolNotImplemented } from "./tool-error.js";
import { buildErrorToolResult, buildSuccessToolResult, type ToolCallResult } from "./tool-result.js";
import type { ToolCallContext, ToolCallRequest } from "./types.js";
import { mapValidationError } from "./validation-mappers.js";

export type { ToolCallContext, ToolCallRequest, ToolHandler } from "./types.js";
export { registerToolHandler } from "./registry.js";

export async function callTool(request: ToolCallRequest, context: ToolCallContext): Promise<ToolCallResult> {
  try {
    const args = normalizeArguments(request.arguments);
    const definition = getToolDefinition(request.name);
    if (!definition) {
      throw toolNotFound(request.name);
    }

    validateToolInputForTool(request.name, definition.inputSchema, args);

    const idempotency = getIdempotency(request, args, context);
    if (idempotency) {
      const stored = findIdempotencyRecord(context.db, idempotency.lookup);
      if (stored) {
        if (stored.argumentsHash !== idempotency.argumentsHash) {
          throw new ToolError({
            errorType: "invalid_request",
            code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_ARGUMENTS",
            message: "The idempotency key was already used with different arguments.",
            reason: "Use the original arguments for a retry, or generate a new idempotency key for a new logical operation.",
            retryable: false,
            details: { idempotencyKey: idempotency.lookup.idempotencyKey },
            next: {
              none: true,
              reason: "Use the original arguments for a retry, or generate a new idempotency key for a new logical operation."
            }
          });
        }
        return JSON.parse(stored.resultJson) as ToolCallResult;
      }
    }

    const handler = getToolHandler(request.name);
    if (!handler) {
      throw toolNotImplemented(request.name);
    }

    const result = buildSuccessToolResult(await handler(args, context));
    if (idempotency) {
      storeIdempotentResult(context.db, idempotency, result);
    }
    return result;
  } catch (error) {
    if (error instanceof ToolError) {
      return buildErrorToolResult(error);
    }
    return buildErrorToolResult(
      new ToolError({
        errorType: "internal_error",
        code: "TOOL_INTERNAL_ERROR",
        message: "Tool execution failed unexpectedly.",
        reason: error instanceof Error ? error.message : "Unknown tool execution error.",
        retryable: false,
        details: {},
        next: {
          none: true,
          reason: "Stop and report the internal tool error."
        }
      })
    );
  }
}

function normalizeArguments(args: unknown): Record<string, unknown> {
  if (args === undefined) return {};
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  throw invalidRequest("TOOL_ARGUMENTS_OBJECT_REQUIRED", "Tool arguments must be an object.", {
    field: "arguments",
    providedValue: args
  });
}

function validateToolInputForTool(name: string, schema: Record<string, unknown>, args: Record<string, unknown>): void {
  try {
    validateToolInput(schema, args);
  } catch (error) {
    if (error instanceof ToolError) {
      throw mapValidationError(name, error);
    }
    throw error;
  }
}
