import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";

import { openInMemoryDatabase, type SqliteDatabase } from "../../src/db/connection.js";
import { runMigrations } from "../../src/db/migrations.js";
import { createApp } from "../../src/http/app.js";
import { expectToolSuccess, McpContractClient } from "../helpers/mcp-contract-client.js";

const publicUrl = "https://steps.example.test/app/";

let db: SqliteDatabase | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

describe("Environment-backed app configuration", () => {
  it("uses the configured public URL in MCP responses and enforces configured origins", async () => {
    db = openInMemoryDatabase();
    runMigrations(db);

    const app = await createApp({
      db,
      publicUrl,
      mcpEndpoint: "/mcp",
      mcpStateful: true,
      mcpJsonResponse: true,
      allowedOrigins: ["https://agent.example.test"]
    });

    await request(app).get("/health").set("Origin", "https://agent.example.test").expect(200);
    await request(app).get("/health").set("Origin", "https://evil.example.test").expect(403);

    const client = new McpContractClient(app);
    await client.initialize();

    const created = expectToolSuccess(await client.callTool("plan.create", { title: "Configured public URL plan" }));
    expect(created.links.reviewUrl).toBe(`https://steps.example.test/app/plans/${created.state.planId}`);
  });
});
