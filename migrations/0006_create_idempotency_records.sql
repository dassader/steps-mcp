CREATE TABLE idempotency_records (
  id TEXT PRIMARY KEY,
  scope_identity TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  target_entity_id TEXT,
  idempotency_key TEXT NOT NULL,
  arguments_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_idempotency_scope_key
  ON idempotency_records(scope_identity, tool_name, COALESCE(target_entity_id, ''), idempotency_key);

CREATE INDEX idx_idempotency_lookup
  ON idempotency_records(scope_identity, tool_name, COALESCE(target_entity_id, ''), arguments_hash);

CREATE INDEX idx_idempotency_expires_at ON idempotency_records(expires_at);
