import type { NextAction } from "../resources/views.js";
import type { NextRecommendation, ToolError, ToolErrorType } from "./tool-error.js";

export interface ToolSuccess {
  ok: true;
  message: string;
  changed: Record<string, number | boolean>;
  resources: Record<string, string | null>;
  links?: Record<string, string>;
  state: Record<string, unknown>;
  page?: Record<string, unknown>;
  next: NextRecommendation;
  planNextAction?: NextAction;
}

export interface ToolErrorContent {
  ok: false;
  errorType: ToolErrorType;
  code: string;
  message: string;
  reason: string;
  retryable: boolean;
  details: Record<string, unknown>;
  resources: Record<string, string | null>;
  next: NextRecommendation;
}

export interface ToolCallResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: ToolSuccess | ToolErrorContent;
  isError: boolean;
}

export function buildSuccessToolResult(success: ToolSuccess): ToolCallResult {
  return {
    content: [{ type: "text", text: success.message }],
    structuredContent: success,
    isError: false
  };
}

export function buildErrorToolResult(error: ToolError): ToolCallResult {
  const structuredContent: ToolErrorContent = {
    ok: false,
    errorType: error.errorType,
    code: error.code,
    message: error.message,
    reason: error.reason,
    retryable: error.retryable,
    details: error.details,
    resources: error.resources,
    next: error.next
  };

  return {
    content: [{ type: "text", text: error.message }],
    structuredContent,
    isError: true
  };
}
