import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-051 - Workflow ordered blocker", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("051");
  });
});
