import type express from "express";
import request from "supertest";
import { expect } from "vitest";

import { createTestApp, type TestAppContext } from "./test-app.js";

export interface McpContractContext {
  app: express.Express;
  client: McpContractClient;
  close: () => void;
}

export interface CreateMcpContractContextOptions {
  autoInitialize?: boolean;
}

export interface RpcOptions {
  headers?: Record<string, string>;
  useSession?: boolean;
}

export class McpContractClient {
  private nextId = 1;
  private sessionId: string | undefined;

  constructor(
    private readonly app: express.Express,
    private readonly endpoint = "/mcp"
  ) {}

  get currentSessionId(): string | undefined {
    return this.sessionId;
  }

  setSessionId(sessionId: string | undefined): void {
    this.sessionId = sessionId;
  }

  async health(headers: Record<string, string> = {}) {
    return request(this.app).get("/health").set(headers);
  }

  async raw(body: unknown, options: RpcOptions = {}) {
    let call = request(this.app)
      .post(this.endpoint)
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json");

    if (options.useSession !== false && this.sessionId) {
      call = call.set("MCP-Session-Id", this.sessionId);
    }
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      call = call.set(key, value);
    }

    const response = await call.send(body);
    const returnedSessionId = response.headers["mcp-session-id"];
    if (typeof returnedSessionId === "string") {
      this.sessionId = returnedSessionId;
    }
    return response;
  }

  async rawText(body: string, options: RpcOptions = {}) {
    let call = request(this.app)
      .post(this.endpoint)
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json");

    if (options.useSession !== false && this.sessionId) {
      call = call.set("MCP-Session-Id", this.sessionId);
    }
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      call = call.set(key, value);
    }

    const response = await call.send(body);
    const returnedSessionId = response.headers["mcp-session-id"];
    if (typeof returnedSessionId === "string") {
      this.sessionId = returnedSessionId;
    }
    return response;
  }

  async rpc(method: string, params: Record<string, unknown> = {}, options: RpcOptions = {}) {
    return this.raw(
      {
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        params
      },
      options
    );
  }

  async notify(method: string, params: Record<string, unknown> = {}, options: RpcOptions = {}) {
    return this.raw(
      {
        jsonrpc: "2.0",
        method,
        params
      },
      options
    );
  }

  async initialize() {
    const initialize = await this.rpc(
      "initialize",
      {
        protocolVersion: "2025-11-25",
        clientInfo: { name: "test-client", version: "0.0.0" },
        capabilities: {}
      },
      { useSession: false }
    );
    expect(initialize.status).toBe(200);
    expect(initialize.body.result.serverInfo.name).toBe("steps-mcp");

    const initialized = await this.notify("notifications/initialized");
    expect([200, 202, 204]).toContain(initialized.status);
    return initialize;
  }

  async listTools() {
    return this.rpc("tools/list");
  }

  async callTool(name: string, args: Record<string, unknown> = {}, meta?: Record<string, unknown>, options: RpcOptions = {}) {
    return this.rpc(
      "tools/call",
      {
        name,
        arguments: args,
        ...(meta ? { _meta: meta } : {})
      },
      options
    );
  }

  async listResources() {
    return this.rpc("resources/list");
  }

  async listResourceTemplates() {
    return this.rpc("resources/templates/list");
  }

  async readResource(uri: string) {
    return this.rpc("resources/read", { uri });
  }

  async listPrompts() {
    return this.rpc("prompts/list");
  }

  async getPrompt(name: string, args: Record<string, unknown> = {}) {
    return this.rpc("prompts/get", { name, arguments: args });
  }

  async complete(ref: Record<string, unknown>, argument: Record<string, unknown>) {
    return this.rpc("completion/complete", { ref, argument });
  }
}

export async function createMcpContractContext(
  options: CreateMcpContractContextOptions = {}
): Promise<McpContractContext> {
  const realContext: TestAppContext = await createTestApp();
  const app = realContext.app;

  const client = new McpContractClient(app);
  if (options.autoInitialize !== false) {
    await client.initialize();
  }

  return {
    app,
    client,
    close: () => {
      realContext.close();
    }
  };
}

export function expectJsonRpcSuccess(response: request.Response) {
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ jsonrpc: "2.0" });
  expect(response.body.error).toBeUndefined();
  expect(response.body.result).toBeDefined();
  return response.body.result;
}

export function expectJsonRpcProtocolError(response: request.Response, code: number) {
  expect([200, 400, 403, 404]).toContain(response.status);
  expect(response.body).toMatchObject({
    jsonrpc: "2.0",
    error: { code }
  });
  expect(response.body.error.message).toEqual(expect.any(String));
  return response.body.error;
}

export function expectToolSuccess(response: request.Response) {
  const result = expectJsonRpcSuccess(response);
  expect(result.isError).not.toBe(true);
  expect(result.content?.[0]).toMatchObject({ type: "text" });
  expect(result.structuredContent).toMatchObject({
    ok: true,
    message: expect.any(String),
    changed: expect.any(Object),
    resources: expect.any(Object),
    state: expect.any(Object),
    next: expect.any(Object)
  });
  return result.structuredContent;
}

export function expectToolError(response: request.Response, code: string, errorType?: string) {
  const result = expectJsonRpcSuccess(response);
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    ok: false,
    code,
    message: expect.any(String),
    reason: expect.any(String),
    retryable: expect.any(Boolean)
  });
  if (errorType) {
    expect(result.structuredContent.errorType).toBe(errorType);
  }
  return result.structuredContent;
}

export function expectPlanNextAction(value: Record<string, unknown>) {
  expect(value.planNextAction).toEqual(
    expect.objectContaining({
      kind: expect.any(String),
      reason: expect.any(String),
      requiresUserInput: expect.any(Boolean),
      shouldContinueRun: expect.any(Boolean)
    })
  );
}

export function parseJsonResource(response: request.Response) {
  const result = expectJsonRpcSuccess(response);
  expect(result.contents).toHaveLength(1);
  const content = result.contents[0];
  expect(content.uri).toEqual(expect.any(String));
  expect(content.text).toEqual(expect.any(String));
  return JSON.parse(content.text);
}

export function expectMarkdownResource(response: request.Response, uri: string) {
  const result = expectJsonRpcSuccess(response);
  expect(result.contents).toHaveLength(1);
  expect(result.contents[0]).toMatchObject({
    uri,
    mimeType: "text/markdown",
    text: expect.stringContaining("#")
  });
  return result.contents[0].text as string;
}

export function expectResourceNotFound(response: request.Response, code: string) {
  const error = expectJsonRpcProtocolError(response, -32000);
  expect(error.data).toMatchObject({
    ok: false,
    errorType: "not_found",
    code,
    resources: expect.any(Object),
    next: expect.any(Object)
  });
  return error.data;
}

export async function createPlanWithSteps(
  client: McpContractClient,
  title = "Contract Plan",
  steps = [
    {
      title: "First step",
      description: "Do the first piece of work.\n\nVerify it with an assertion.",
      order: 0
    },
    {
      title: "Second step",
      description: "Do the second piece of work.\n\nVerify it with an assertion.",
      order: 1
    }
  ]
) {
  const created = expectToolSuccess(await client.callTool("plan.create_with_steps", { title, steps }));
  return {
    planId: String(created.state.planId),
    stepIds: created.state.stepIds as string[],
    created
  };
}

export async function approvePlan(client: McpContractClient, planId: string) {
  return expectToolSuccess(await client.callTool("plan.approve", { planId, approvalEvidence: "Approved by integration test." }));
}

export async function startNextStep(client: McpContractClient, planId: string, idempotencyKey?: string) {
  return expectToolSuccess(
    await client.callTool(
      "step.start_next",
      {
        planId,
        noteText: "Starting the server-selected step.",
        author: "agent"
      },
      idempotencyKey ? { idempotencyKey } : undefined
    )
  );
}

export async function transitionStep(
  client: McpContractClient,
  stepId: string,
  fromStatus: string,
  toStatus: string,
  idempotencyKey?: string
) {
  return expectToolSuccess(
    await client.callTool(
      "step.transition",
      {
        stepId,
        fromStatus,
        toStatus,
        noteText: `Transition from ${fromStatus} to ${toStatus}.`,
        author: "agent"
      },
      idempotencyKey ? { idempotencyKey } : undefined
    )
  );
}

export async function createNote(client: McpContractClient, stepId: string, text = "Evidence note.") {
  return expectToolSuccess(await client.callTool("note.create", { stepId, text, author: "agent" }));
}

export async function createAttachment(client: McpContractClient, noteId: string, name = "evidence.txt") {
  return expectToolSuccess(
    await client.callTool("attachment.create", {
      noteId,
      name,
      mimeType: "text/plain",
      content: { text: "example evidence" }
    })
  );
}
