import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-018 - Prompts get happy paths", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("018");
  });
});
