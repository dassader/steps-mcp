CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'executing', 'paused', 'completed', 'blocked')),
  blocker_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_plans_status_updated ON plans(status, updated_at DESC, id);
CREATE INDEX idx_plans_updated ON plans(updated_at DESC, id);
