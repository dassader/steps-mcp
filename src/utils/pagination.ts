export type CursorValue = string | number | boolean | null;

export interface CursorPayload {
  scope: string;
  lastId?: string;
  offset?: number;
  sort?: string;
  [key: string]: CursorValue | undefined;
}

export interface PageInfo {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

interface VersionedCursorPayload extends CursorPayload {
  version: 1;
}

export class InvalidCursorError extends Error {
  readonly code = "INVALID_CURSOR";

  constructor(message: string) {
    super(message);
    this.name = "InvalidCursorError";
  }
}

export function encodeCursor(payload: CursorPayload): string {
  const encoded: VersionedCursorPayload = { version: 1, ...payload };
  return Buffer.from(JSON.stringify(encoded), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string, scope: string): CursorPayload {
  const payload = parseCursor(cursor);
  if (payload.scope !== scope) {
    throw new InvalidCursorError("Cursor scope does not match this request.");
  }
  return payload;
}

export function buildPageInfo(limit: number, items: unknown[], hasMore: boolean, nextCursor?: string | null): PageInfo {
  return {
    limit,
    hasMore,
    ...(hasMore && nextCursor ? { nextCursor } : {})
  };
}

export function normalizeLimit(limit: number | undefined, defaults = { defaultLimit: 50, maxLimit: 100 }): number {
  if (limit === undefined) return defaults.defaultLimit;
  if (!Number.isInteger(limit) || limit < 1) return defaults.defaultLimit;
  return Math.min(limit, defaults.maxLimit);
}

function parseCursor(cursor: string): VersionedCursorPayload {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<VersionedCursorPayload>;
    if (!isVersionedCursorPayload(parsed)) {
      throw new InvalidCursorError("Cursor payload is malformed.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof InvalidCursorError) throw error;
    throw new InvalidCursorError("Cursor is not valid base64url JSON.");
  }
}

function isVersionedCursorPayload(value: Partial<VersionedCursorPayload>): value is VersionedCursorPayload {
  return value.version === 1 && typeof value.scope === "string" && value.scope.length > 0;
}
