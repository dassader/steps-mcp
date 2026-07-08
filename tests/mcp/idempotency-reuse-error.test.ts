import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-045 - Idempotency reuse error", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("045");
  });
});
