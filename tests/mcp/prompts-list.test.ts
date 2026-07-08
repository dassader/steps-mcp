import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-017 - Prompts list", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("017");
  });
});
