CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'implementing', 'verification', 'blocked', 'done')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_steps_plan_order ON steps(plan_id, order_index, created_at, id);
CREATE INDEX idx_steps_plan_status ON steps(plan_id, status);
CREATE INDEX idx_steps_status_order ON steps(status, order_index, created_at, id);
