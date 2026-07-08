import { describe, expect, it } from "vitest";

import { createMcpContractContext, expectJsonRpcProtocolError } from "../helpers/mcp-contract-client.js";

describe("prompts/get validation branches", () => {
  it("rejects unknown arguments, invalid UUIDs, invalid enums, and non-object arguments", async () => {
    const context = await createMcpContractContext();
    try {
      const unknown = expectJsonRpcProtocolError(
        await context.client.getPrompt("plan.break_down", { goal: "Build", extra: "nope" }),
        -32602
      );
      expect(unknown.data.code).toBe("PROMPT_ARGUMENT_UNKNOWN");

      const badPlanId = expectJsonRpcProtocolError(await context.client.getPrompt("plan.execute", { planId: "not-a-uuid" }), -32602);
      expect(badPlanId.data.code).toBe("PROMPT_ARGUMENT_INVALID");

      const badStatus = expectJsonRpcProtocolError(
        await context.client.getPrompt("transition.prepare_note", {
          stepId: "00000000-0000-4000-8000-000000000001",
          toStatus: "shipped",
          reason: "Done"
        }),
        -32602
      );
      expect(badStatus.data.code).toBe("PROMPT_ARGUMENT_INVALID");

      const badArguments = expectJsonRpcProtocolError(
        await context.client.rpc("prompts/get", { name: "plan.break_down", arguments: "not-an-object" }),
        -32602
      );
      expect(badArguments.data.code).toBe("PROMPT_ARGUMENTS_OBJECT_REQUIRED");
    } finally {
      context.close();
    }
  });
});
