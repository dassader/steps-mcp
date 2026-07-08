import { describe, expect, it } from "vitest";

import { createMcpContractContext } from "../helpers/mcp-contract-client.js";

describe("IMPLEMENTATION-TASK-053 - Cancellation", () => {
  it("accepts cancellation notifications without breaking the session", async () => {
    const context = await createMcpContractContext();
    try {
      const cancelled = await context.client.notify("notifications/cancelled", {
        requestId: "missing-request",
        reason: "No longer needed."
      });
      expect([200, 202, 204]).toContain(cancelled.status);

      const malformed = await context.client.notify("notifications/cancelled", {
        reason: "Missing request id should be ignored."
      });
      expect([200, 202, 204]).toContain(malformed.status);

      const ping = await context.client.rpc("ping");
      expect(ping.status).toBe(200);
      expect(ping.body.result).toEqual({});
    } finally {
      context.close();
    }
  });
});
