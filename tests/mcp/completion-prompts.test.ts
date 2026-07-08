import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-020 - Prompt completion", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("020");
  });
});
