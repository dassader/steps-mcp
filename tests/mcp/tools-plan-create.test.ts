import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-023 - Plan create tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("023");
  });
});
