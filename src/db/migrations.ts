import fs from "node:fs";
import path from "node:path";

import type { SqliteDatabase } from "./connection.js";

export interface Migration {
  id: string;
  filename: string;
  sql: string;
}

export interface MigrationStatus {
  id: string;
  filename: string;
  applied: boolean;
}

export interface MigrationResult {
  applied: string[];
}

export interface MigrationOptions {
  migrationsDir?: string;
}

const DEFAULT_MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

function getMigrationsDir(options?: MigrationOptions): string {
  return options?.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
}

export function ensureMigrationsTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

export function loadMigrations(options?: MigrationOptions): Migration[] {
  const migrationsDir = getMigrationsDir(options);

  return fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort()
    .map((filename) => ({
      id: filename.replace(/\.sql$/, ""),
      filename,
      sql: fs.readFileSync(path.join(migrationsDir, filename), "utf8")
    }));
}

export function getAppliedMigrationIds(db: SqliteDatabase): Set<string> {
  ensureMigrationsTable(db);

  const rows = db.prepare<[], { id: string }>("SELECT id FROM schema_migrations").all();
  return new Set(rows.map((row) => row.id));
}

export function getMigrationStatus(db: SqliteDatabase, options?: MigrationOptions): MigrationStatus[] {
  const applied = getAppliedMigrationIds(db);

  return loadMigrations(options).map((migration) => ({
    id: migration.id,
    filename: migration.filename,
    applied: applied.has(migration.id)
  }));
}

export function runMigrations(db: SqliteDatabase, options?: MigrationOptions): MigrationResult {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrationIds(db);
  const pending = loadMigrations(options).filter((migration) => !applied.has(migration.id));

  const applyPending = db.transaction((migrations: Migration[]) => {
    const insert = db.prepare<[string, string]>(
      "INSERT INTO schema_migrations (id, filename) VALUES (?, ?)"
    );

    for (const migration of migrations) {
      db.exec(migration.sql);
      insert.run(migration.id, migration.filename);
    }
  });

  applyPending(pending);

  return {
    applied: pending.map((migration) => migration.id)
  };
}
