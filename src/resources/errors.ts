export type ResourceErrorType = "invalid_request" | "not_found" | "state_error" | "internal_error";

export interface ResourceReadErrorOptions {
  jsonRpcCode: number;
  errorType: ResourceErrorType;
  code: string;
  message: string;
  reason: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  resources?: Record<string, string | null>;
  next?: Record<string, unknown>;
}

export class ResourceReadError extends Error {
  readonly jsonRpcCode: number;
  readonly errorType: ResourceErrorType;
  readonly code: string;
  readonly reason: string;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;
  readonly resources: Record<string, string | null>;
  readonly next: Record<string, unknown>;

  constructor(options: ResourceReadErrorOptions) {
    super(options.message);
    this.name = "ResourceReadError";
    this.jsonRpcCode = options.jsonRpcCode;
    this.errorType = options.errorType;
    this.code = options.code;
    this.reason = options.reason;
    this.retryable = options.retryable;
    this.details = options.details ?? {};
    this.resources = options.resources ?? {};
    this.next = options.next ?? {};
  }
}

export function resourceNotFound(code: string, message: string, details: Record<string, unknown>): ResourceReadError {
  return new ResourceReadError({
    jsonRpcCode: -32000,
    errorType: "not_found",
    code,
    message,
    reason: "The requested resource does not exist or is not visible.",
    retryable: false,
    details,
    next: {}
  });
}

export function invalidResourceRequest(code: string, reason: string, details: Record<string, unknown>): ResourceReadError {
  return new ResourceReadError({
    jsonRpcCode: -32602,
    errorType: "invalid_request",
    code,
    message: "Invalid resource request.",
    reason,
    retryable: true,
    details,
    next: {}
  });
}

export function resourceStateError(code: string, message: string, reason: string, details: Record<string, unknown>): ResourceReadError {
  return new ResourceReadError({
    jsonRpcCode: -32000,
    errorType: "state_error",
    code,
    message,
    reason,
    retryable: false,
    details,
    next: {}
  });
}
