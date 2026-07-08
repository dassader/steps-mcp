import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-019 - Prompts get validation", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("019");
  });
});
