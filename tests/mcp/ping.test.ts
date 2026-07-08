import { describe, expect, it } from "vitest";

import { createMcpContractContext, expectJsonRpcSuccess } from "../helpers/mcp-contract-client.js";

describe("IMPLEMENTATION-TASK-050 - Ping", () => {
  it("returns an empty result after initialization", async () => {
    const context = await createMcpContractContext();
    try {
      const result = expectJsonRpcSuccess(await context.client.rpc("ping"));
      expect(result).toEqual({});
    } finally {
      context.close();
    }
  });
});
