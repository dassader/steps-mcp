import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-037 - Step transition errors", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("037");
  });
});
