import { describe, expect, it } from "vitest";

import {
  createMcpContractContext,
  createPlanWithSteps,
  expectJsonRpcProtocolError
} from "../helpers/mcp-contract-client.js";

function expectResourceInvalid(error: ReturnType<typeof expectJsonRpcProtocolError>, code: string) {
  expect(error.data).toMatchObject({
    ok: false,
    errorType: "invalid_request",
    code,
    details: expect.any(Object),
    resources: expect.any(Object),
    next: expect.any(Object)
  });
}

describe("resources/read invalid URI branches", () => {
  it("returns diagnostic errors for invalid suffixes and timeline query parameters", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Resource errors");
      const stepId = fixture.stepIds[0];

      expectResourceInvalid(
        expectJsonRpcProtocolError(await context.client.readResource(`steps://plans/${fixture.planId}/unknown`), -32602),
        "UNKNOWN_PLAN_RESOURCE_SUFFIX"
      );
      expectResourceInvalid(
        expectJsonRpcProtocolError(await context.client.readResource(`steps://steps/${stepId}/unknown`), -32602),
        "UNKNOWN_STEP_RESOURCE_SUFFIX"
      );
      expectResourceInvalid(
        expectJsonRpcProtocolError(await context.client.readResource("steps://notes/00000000-0000-4000-8000-000000000001/unknown"), -32602),
        "UNKNOWN_NOTE_RESOURCE_SUFFIX"
      );
      expectResourceInvalid(
        expectJsonRpcProtocolError(
          await context.client.readResource("steps://attachments/00000000-0000-4000-8000-000000000001/unknown"),
          -32602
        ),
        "UNKNOWN_ATTACHMENT_RESOURCE_SUFFIX"
      );
      expectResourceInvalid(
        expectJsonRpcProtocolError(await context.client.readResource(`steps://plans/${fixture.planId}/timeline?limit=0`), -32602),
        "INVALID_TIMELINE_LIMIT"
      );
      expectResourceInvalid(
        expectJsonRpcProtocolError(await context.client.readResource(`steps://plans/${fixture.planId}/timeline?type=bad`), -32602),
        "INVALID_TIMELINE_TYPE"
      );
    } finally {
      context.close();
    }
  });
});
