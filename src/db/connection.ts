import fs from "node:fs";
import path from "node:path";

import DatabaseConstructor from "better-sqlite3";

export type SqliteDatabase = DatabaseConstructor.Database;

export interface OpenDatabaseOptions {
  filename: string;
  readonly?: boolean;
}

export function openDatabase(options: OpenDatabaseOptions): SqliteDatabase {
  if (options.filename !== ":memory:") {
    fs.mkdirSync(path.dirname(options.filename), { recursive: true });
  }

  const db = new DatabaseConstructor(options.filename, {
    readonly: options.readonly ?? false
  });

  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (options.filename !== ":memory:" && !options.readonly) {
    db.pragma("journal_mode = WAL");
  }

  return db;
}

export function openInMemoryDatabase(): SqliteDatabase {
  return openDatabase({ filename: ":memory:" });
}
