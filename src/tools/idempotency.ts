import { createHash } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import { storeIdempotencyRecord } from "../repositories/idempotency.repository.js";
import type { ToolCallContext, ToolCallRequest } from "./types.js";
import type { ToolCallResult } from "./tool-result.js";

const idempotencyTtlMs = 24 * 60 * 60 * 1000;

export interface ToolIdempotency {
  lookup: {
    scopeIdentity: string;
    toolName: string;
    targetEntityId: string | null;
    idempotencyKey: string;
  };
  argumentsHash: string;
}

export function getIdempotency(
  request: ToolCallRequest,
  args: Record<string, unknown>,
  context: ToolCallContext
): ToolIdempotency | null {
  const idempotencyKey = readIdempotencyKey(request._meta);
  if (!idempotencyKey) return null;

  const targetEntityId = findTargetEntityId(args);
  return {
    lookup: {
      scopeIdentity: context.scopeIdentity ?? "anonymous",
      toolName: request.name,
      targetEntityId,
      idempotencyKey
    },
    argumentsHash: hashArguments(args)
  };
}

export function storeIdempotentResult(db: SqliteDatabase, idempotency: ToolIdempotency, result: ToolCallResult): void {
  storeIdempotencyRecord(db, {
    ...idempotency.lookup,
    argumentsHash: idempotency.argumentsHash,
    resultJson: JSON.stringify(result),
    expiresAt: new Date(Date.now() + idempotencyTtlMs).toISOString()
  });
}

function readIdempotencyKey(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>).idempotencyKey;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function findTargetEntityId(args: Record<string, unknown>): string | null {
  for (const key of ["planId", "stepId", "noteId", "attachmentId"]) {
    const value = args[key];
    if (typeof value === "string") return value;
  }
  return null;
}

function hashArguments(args: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(args)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
