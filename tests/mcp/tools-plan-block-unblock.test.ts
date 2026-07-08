import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-029 - Plan block unblock tools", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("029");
  });
});
