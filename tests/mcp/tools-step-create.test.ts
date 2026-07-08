import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-032 - Step create tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("032");
  });
});
