import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-022 - Completion errors", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("022");
  });
});
