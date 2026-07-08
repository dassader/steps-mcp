import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-004 - Resources list documentation", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("004");
  });
});
