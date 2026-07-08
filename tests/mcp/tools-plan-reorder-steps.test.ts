import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-030 - Plan reorder steps tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("030");
  });
});
