import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-007 - Read plan detail resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("007");
  });
});
