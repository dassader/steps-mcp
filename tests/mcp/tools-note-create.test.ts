import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-039 - Note create tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("039");
  });
});
