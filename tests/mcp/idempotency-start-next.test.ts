import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-043 - Idempotency start next", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("043");
  });
});
