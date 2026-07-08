import { afterEach, describe, expect, it } from "vitest";

import { openInMemoryDatabase, type SqliteDatabase } from "../../src/db/connection.js";
import { getMigrationStatus, runMigrations } from "../../src/db/migrations.js";

describe("database migrations", () => {
  let db: SqliteDatabase | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("applies all migrations to an in-memory SQLite database", () => {
    db = openInMemoryDatabase();

    const result = runMigrations(db);
    const statuses = getMigrationStatus(db);

    expect(result.applied).toEqual([
      "0001_create_plans",
      "0002_create_steps",
      "0003_create_notes",
      "0004_create_transitions",
      "0005_create_attachments",
      "0006_create_idempotency_records"
    ]);
    expect(statuses.every((status) => status.applied)).toBe(true);

    const tables = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      )
      .all()
      .map((row) => row.name);

    expect(tables).toEqual(
      expect.arrayContaining([
        "attachments",
        "idempotency_records",
        "notes",
        "plans",
        "schema_migrations",
        "steps",
        "transitions"
      ])
    );

    const planColumns = db.prepare<[], { name: string }>("PRAGMA table_info(plans)").all().map((row) => row.name);
    expect(planColumns).toEqual(expect.arrayContaining(["id", "title", "status", "blocker_reason", "created_at", "updated_at"]));

    const idempotencyColumns = db
      .prepare<[], { name: string }>("PRAGMA table_info(idempotency_records)")
      .all()
      .map((row) => row.name);
    expect(idempotencyColumns).toEqual(
      expect.arrayContaining([
        "id",
        "scope_identity",
        "tool_name",
        "target_entity_id",
        "idempotency_key",
        "arguments_hash",
        "result_json",
        "expires_at"
      ])
    );
  });
});
