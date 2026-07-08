import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-038 - Step delete tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("038");
  });
});
