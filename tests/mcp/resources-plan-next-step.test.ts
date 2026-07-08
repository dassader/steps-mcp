import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-009 - Read plan next-step resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("009");
  });
});
