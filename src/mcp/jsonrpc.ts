export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcErrorData {
  code?: string;
  reason?: string;
  [key: string]: unknown;
}

export const jsonRpcErrors = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  serverNotInitialized: -32002,
  resourceNotFound: -32000
} as const;

export function parseJsonRpcRequest(rawBody: string): JsonRpcRequest | { error: ReturnType<typeof createErrorResponse> } {
  let parsed: unknown;
  try {
    parsed = rawBody.length > 0 ? JSON.parse(rawBody) : undefined;
  } catch {
    return {
      error: createErrorResponse(null, jsonRpcErrors.invalidRequest, "Invalid Request", {
        code: "INVALID_JSON",
        reason: "Request body must be valid JSON."
      })
    };
  }

  if (!isJsonRpcRequest(parsed)) {
    return {
      error: createErrorResponse(getPossibleId(parsed), jsonRpcErrors.invalidRequest, "Invalid Request", {
        code: "INVALID_JSONRPC_REQUEST",
        reason: "Request must be a JSON-RPC 2.0 object with a method."
      })
    };
  }

  return parsed;
}

export function createResponse(id: JsonRpcId | undefined, result: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

export function createErrorResponse(id: JsonRpcId | undefined, code: number, message: string, data?: JsonRpcErrorData) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === "2.0" && typeof candidate.method === "string";
}

function getPossibleId(value: unknown): JsonRpcId | undefined {
  if (!value || typeof value !== "object") return undefined;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" || typeof id === "number" || id === null ? id : undefined;
}
