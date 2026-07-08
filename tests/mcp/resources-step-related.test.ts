import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-014 - Read step related resources", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("014");
  });
});
