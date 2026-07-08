import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-008 - Read plan steps resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("008");
  });
});
