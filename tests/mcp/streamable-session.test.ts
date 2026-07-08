import { describe, it } from "vitest";

import { runScenario } from "../helpers/steps-contract-scenarios.js";

describe("TEST-TASK-046 - Streamable HTTP session", () => {
  it("matches the Steps MCP contract", async () => {
    await runScenario("046");
  });
});
