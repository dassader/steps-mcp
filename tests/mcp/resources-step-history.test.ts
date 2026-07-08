import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-013 - Read step history resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("013");
  });
});
