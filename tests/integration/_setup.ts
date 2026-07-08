import request from "supertest";

import { createApp } from "../../src/http/app.js";
import { openInMemoryDatabase, type SqliteDatabase } from "../../src/db/connection.js";
import { runMigrations } from "../../src/db/migrations.js";

export interface IntegrationTestAppContext {
  app: Awaited<ReturnType<typeof createApp>>;
  db: SqliteDatabase;
  request: typeof request;
  close: () => void;
}

export let db: SqliteDatabase | undefined;

export async function createTestApp(): Promise<IntegrationTestAppContext> {
  const database = openInMemoryDatabase();
  db = database;
  runMigrations(database);

  const app = await createApp({
    db: database,
    publicUrl: "http://127.0.0.1:0",
    mcpEndpoint: "/mcp",
    mcpStateful: true,
    mcpJsonResponse: true
  });

  return {
    app,
    db: database,
    request,
    close: () => {
      database.close();
      if (db === database) {
        db = undefined;
      }
    }
  };
}
