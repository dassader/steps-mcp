CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL,
  text TEXT NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('human', 'agent')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_step_created ON notes(step_id, created_at, id);
