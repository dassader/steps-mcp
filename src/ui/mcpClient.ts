interface JsonRpcErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id?: number;
  result?: T;
  error?: JsonRpcErrorPayload;
}

interface McpToolResult<TStructured> {
  content?: Array<{ type: string; text?: string }>;
  structuredContent: TStructured;
  isError?: boolean;
}

interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

interface McpReadResourceResult {
  contents: McpResourceContent[];
}

interface McpRequestOptions {
  signal?: AbortSignal;
}

interface McpToolOptions extends McpRequestOptions {
  meta?: Record<string, unknown>;
}

export interface McpAttachmentContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

let nextRequestId = 1;
let sessionId: string | null = null;
let initializePromise: Promise<void> | null = null;

export async function callMcpTool<TStructured>(
  name: string,
  args: Record<string, unknown> = {},
  options: McpToolOptions = {}
): Promise<TStructured> {
  const result = await requestWithInitializedSession<McpToolResult<TStructured>>(
    "tools/call",
    {
      name,
      arguments: args,
      ...(options.meta ? { _meta: options.meta } : {})
    },
    options
  );

  if (result.isError) {
    throw toMcpStructuredError(result.structuredContent);
  }

  return result.structuredContent;
}

export async function readMcpJsonResource<T>(uri: string, options: McpRequestOptions = {}): Promise<T> {
  const result = await requestWithInitializedSession<McpReadResourceResult>("resources/read", { uri }, options);
  const content = result.contents[0];
  if (!content?.text) {
    throw new Error("MCP resource did not return JSON text.");
  }

  try {
    return JSON.parse(content.text) as T;
  } catch {
    throw new Error("MCP resource returned invalid JSON.");
  }
}

export async function readMcpAttachmentContent(uri: string, options: McpRequestOptions = {}): Promise<McpAttachmentContent> {
  const result = await requestWithInitializedSession<McpReadResourceResult>("resources/read", { uri }, options);
  const content = result.contents[0];
  if (!content) {
    throw new Error("MCP attachment content was not returned.");
  }

  return {
    uri: content.uri,
    mimeType: content.mimeType ?? "application/octet-stream",
    text: content.text,
    blob: content.blob
  };
}

export function resetMcpSessionForTests(): void {
  sessionId = null;
  initializePromise = null;
  nextRequestId = 1;
}

async function requestWithInitializedSession<T>(
  method: string,
  params: Record<string, unknown>,
  options: McpRequestOptions
): Promise<T> {
  await ensureInitialized(options);

  try {
    return await sendJsonRpc<T>(method, params, options);
  } catch (error) {
    if (!isServerNotInitialized(error)) {
      throw error;
    }
  }

  sessionId = null;
  initializePromise = null;
  await ensureInitialized(options);
  return sendJsonRpc<T>(method, params, options);
}

async function ensureInitialized(options: McpRequestOptions): Promise<void> {
  if (sessionId) return;

  initializePromise ??= initialize(options).finally(() => {
    initializePromise = null;
  });
  await initializePromise;
}

async function initialize(options: McpRequestOptions): Promise<void> {
  const initializeResponse = await sendJsonRpc<{ protocolVersion: string }>(
    "initialize",
    {
      protocolVersion: "2025-11-25",
      clientInfo: {
        name: "steps-ui",
        version: "0.0.0"
      },
      capabilities: {}
    },
    options,
    { useSession: false }
  );

  if (!initializeResponse.protocolVersion) {
    throw new Error("MCP initialize did not return a protocol version.");
  }

  await sendNotification("notifications/initialized", {}, options);
}

async function sendJsonRpc<T>(
  method: string,
  params: Record<string, unknown>,
  options: McpRequestOptions,
  requestOptions: { useSession?: boolean } = {}
): Promise<T> {
  const response = await fetch("/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(requestOptions.useSession === false || !sessionId ? {} : { "MCP-Session-Id": sessionId })
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextRequestId++,
      method,
      params
    }),
    signal: options.signal
  });

  const returnedSessionId = response.headers.get("MCP-Session-Id");
  if (returnedSessionId) {
    sessionId = returnedSessionId;
  }

  const body = await readJsonRpcResponse<T>(response);
  if (body.error) {
    throw toJsonRpcError(body.error);
  }
  if (body.result === undefined) {
    throw new Error("MCP response did not include a result.");
  }
  return body.result;
}

async function sendNotification(method: string, params: Record<string, unknown>, options: McpRequestOptions): Promise<void> {
  const response = await fetch("/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(sessionId ? { "MCP-Session-Id": sessionId } : {})
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params
    }),
    signal: options.signal
  });

  const returnedSessionId = response.headers.get("MCP-Session-Id");
  if (returnedSessionId) {
    sessionId = returnedSessionId;
  }

  if (!response.ok) {
    const body = await readJsonRpcResponse<unknown>(response);
    if (body.error) throw toJsonRpcError(body.error);
    throw new Error("MCP notification failed.");
  }
}

async function readJsonRpcResponse<T>(response: Response): Promise<JsonRpcResponse<T>> {
  const text = await response.text();
  if (!text) {
    return { jsonrpc: "2.0" };
  }

  try {
    return JSON.parse(text) as JsonRpcResponse<T>;
  } catch {
    throw new Error("MCP response was not valid JSON.");
  }
}

function toJsonRpcError(error: JsonRpcErrorPayload): Error {
  const details = error.data && typeof error.data === "object" ? (error.data as Record<string, unknown>) : {};
  const message = typeof details.message === "string" ? details.message : error.message;
  const result = new Error(message);
  result.name = "McpJsonRpcError";
  (result as Error & { code?: unknown }).code = details.code ?? error.code;
  return result;
}

function toMcpStructuredError(structuredContent: unknown): Error {
  if (structuredContent && typeof structuredContent === "object") {
    const record = structuredContent as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : "MCP tool failed.";
    const result = new Error(message);
    result.name = "McpToolError";
    (result as Error & { code?: unknown }).code = record.code;
    return result;
  }

  return new Error("MCP tool failed.");
}

function isServerNotInitialized(error: unknown): boolean {
  return error instanceof Error && (error as Error & { code?: unknown }).code === "SERVER_NOT_INITIALIZED";
}
