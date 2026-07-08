import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-016 - Read attachment content resource", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("016");
  });
});
