import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-003 - Lifecycle before initialized", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("003");
  });
});
