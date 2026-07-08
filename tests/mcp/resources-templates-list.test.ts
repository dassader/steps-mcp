import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-005 - Resource templates list", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("005");
  });
});
