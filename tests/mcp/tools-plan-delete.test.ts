import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-031 - Plan delete tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("031");
  });
});
