import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-011 - Read plan timeline resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("011");
  });
});
