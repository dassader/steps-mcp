import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-010 - Read plan summary resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("010");
  });
});
