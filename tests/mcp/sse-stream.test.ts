import http from "node:http";
import type { AddressInfo } from "node:net";

import { describe, expect, it } from "vitest";

import { sendSSE } from "../../src/transport/sse.js";
import { McpContractClient } from "../helpers/mcp-contract-client.js";
import { createTestApp } from "../helpers/test-app.js";

describe("IMPLEMENTATION-TASK-051 - SSE stream", () => {
  it("keeps GET /mcp open and delivers an SSE event for the initialized session", async () => {
    const context = await createTestApp();
    const server = context.app.listen(0);
    try {
      const client = new McpContractClient(context.app);
      await client.initialize();
      const sessionId = client.currentSessionId;
      expect(sessionId).toBeDefined();

      const port = (server.address() as AddressInfo).port;
      const received = await readOneSseEvent(port, sessionId as string);

      expect(received).toContain(": connected");
      expect(received).toContain("event: test.event");
      expect(received).toContain('data: {"ok":true}');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      context.close();
    }
  });
});

function readOneSseEvent(port: number, sessionId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let body = "";
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/mcp",
        headers: {
          Accept: "text/event-stream",
          "MCP-Session-Id": sessionId
        }
      },
      (response) => {
        expect(response.statusCode).toBe(200);
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
          if (body.includes("event: test.event") && body.includes('data: {"ok":true}') && !settled) {
            settled = true;
            request.destroy();
            resolve(body);
          }
        });
      }
    );

    request.on("error", (error) => {
      if (settled) return;
      reject(error);
    });

    setTimeout(() => sendSSE(sessionId, "test.event", { ok: true }), 25);
    setTimeout(() => {
      if (settled) return;
      settled = true;
      request.destroy();
      reject(new Error("Timed out waiting for SSE event."));
    }, 1000);
  });
}
