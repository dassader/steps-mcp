import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-042 - Attachment update delete tools", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("042");
  });
});
