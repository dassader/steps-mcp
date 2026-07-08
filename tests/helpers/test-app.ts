import type { SqliteDatabase } from "../../src/db/connection.js";
import { createTestApp as createIntegrationTestApp } from "../integration/_setup.js";

export interface TestAppContext {
  app: Awaited<ReturnType<typeof createIntegrationTestApp>>["app"];
  db: SqliteDatabase;
  close: () => void;
}

export async function createTestApp(): Promise<TestAppContext> {
  const context = await createIntegrationTestApp();

  return {
    app: context.app,
    db: context.db,
    close: context.close
  };
}
