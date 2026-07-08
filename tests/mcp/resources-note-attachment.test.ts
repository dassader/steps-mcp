import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-015 - Read note and attachment resources", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("015");
  });
});
