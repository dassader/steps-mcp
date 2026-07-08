import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { IdempotencyRecord } from "../domain/types.js";
import { mapIdempotency, type IdempotencyRow } from "./mappers.js";

export interface IdempotencyLookup {
  scopeIdentity: string;
  toolName: string;
  targetEntityId?: string | null;
  idempotencyKey: string;
}

export interface IdempotencyStoreInput extends IdempotencyLookup {
  argumentsHash: string;
  resultJson: string;
  expiresAt: string;
}

export function findIdempotencyRecord(db: SqliteDatabase, input: IdempotencyLookup): IdempotencyRecord | null {
  const row = db
    .prepare<[string, string, string, string], IdempotencyRow>(
      `
        SELECT *
        FROM idempotency_records
        WHERE scope_identity = ?
          AND tool_name = ?
          AND COALESCE(target_entity_id, '') = ?
          AND idempotency_key = ?
        LIMIT 1
      `
    )
    .get(input.scopeIdentity, input.toolName, input.targetEntityId ?? "", input.idempotencyKey);
  return row ? mapIdempotency(row) : null;
}

export function storeIdempotencyRecord(
  db: SqliteDatabase,
  input: IdempotencyStoreInput,
  id = randomUUID()
): IdempotencyRecord {
  db.prepare<[string, string, string, string | null, string, string, string, string]>(
    `
      INSERT INTO idempotency_records (
        id, scope_identity, tool_name, target_entity_id, idempotency_key, arguments_hash, result_json, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    input.scopeIdentity,
    input.toolName,
    input.targetEntityId ?? null,
    input.idempotencyKey,
    input.argumentsHash,
    input.resultJson,
    input.expiresAt
  );
  const record = findIdempotencyRecord(db, input);
  if (!record) throw new Error("Idempotency record was not stored.");
  return record;
}

export function cleanupExpiredIdempotencyRecords(db: SqliteDatabase, nowIso: string): number {
  return db.prepare<[string]>("DELETE FROM idempotency_records WHERE expires_at <= ?").run(nowIso).changes;
}
