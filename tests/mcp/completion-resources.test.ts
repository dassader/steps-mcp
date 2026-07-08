import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-021 - Resource completion", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("021");
  });
});
