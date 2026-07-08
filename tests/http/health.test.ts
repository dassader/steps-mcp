import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-001 - Health endpoint", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("001");
  });
});
