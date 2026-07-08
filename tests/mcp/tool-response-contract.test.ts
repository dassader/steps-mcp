import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-054 - Tool response contract", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("054");
  });
});
