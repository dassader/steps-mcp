import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-041 - Attachment create tool", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("041");
  });
});
