export type ToolErrorType =
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "state_error"
  | "permission_denied"
  | "internal_error";

export interface NextRecommendation {
  recommendedPrompt?: string;
  recommendedTool?: string;
  recommendedResource?: string;
  recommendedUserAction?: string;
  none?: boolean;
  reason: string;
}

export interface ToolErrorOptions {
  errorType: ToolErrorType;
  code: string;
  message: string;
  reason?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  resources?: Record<string, string | null>;
  next?: NextRecommendation;
}

export class ToolError extends Error {
  readonly errorType: ToolErrorType;
  readonly code: string;
  readonly reason: string;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;
  readonly resources: Record<string, string | null>;
  readonly next: NextRecommendation;

  constructor(options: ToolErrorOptions) {
    super(options.message);
    this.name = "ToolError";
    this.errorType = options.errorType;
    this.code = options.code;
    this.reason = options.reason ?? options.message;
    this.retryable = options.retryable;
    this.details = options.details ?? {};
    this.resources = options.resources ?? {};
    this.next = options.next ?? { none: true, reason: "No automatic recovery is available." };
  }
}

export function invalidRequest(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  next: NextRecommendation = { reason: "Fix the request arguments and retry the same tool call." }
): ToolError {
  return new ToolError({
    errorType: "invalid_request",
    code,
    message,
    retryable: true,
    details,
    next
  });
}

export function toolNotFound(name: string): ToolError {
  return new ToolError({
    errorType: "invalid_request",
    code: "TOOL_NOT_FOUND",
    message: "Tool was not found.",
    reason: "The requested tool name is not exposed by this server.",
    retryable: true,
    details: { name },
    next: {
      recommendedTool: "tools/list",
      reason: "Call tools/list and choose one of the returned tool names."
    }
  });
}

export function toolNotImplemented(name: string): ToolError {
  return new ToolError({
    errorType: "invalid_request",
    code: "TOOL_NOT_IMPLEMENTED",
    message: `Tool ${name} is not implemented yet.`,
    reason: "This tool is exposed by the contract but its mutation handler will be implemented by a later task.",
    retryable: false,
    details: { name },
    next: {
      none: true,
      reason: "Wait for the server implementation of this tool before calling it."
    }
  });
}
