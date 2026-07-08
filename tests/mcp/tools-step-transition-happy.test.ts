import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-036 - Step transition happy path", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("036");
  });
});
