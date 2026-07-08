import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-034 - Step start next happy path", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("034");
  });
});
