import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-035 - Step start next errors", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("035");
  });
});
