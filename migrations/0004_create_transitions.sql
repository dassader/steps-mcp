CREATE TABLE transitions (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  from_status TEXT NOT NULL
    CHECK (from_status IN ('todo', 'implementing', 'verification', 'blocked', 'done')),
  to_status TEXT NOT NULL
    CHECK (to_status IN ('todo', 'implementing', 'verification', 'blocked', 'done')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transitions_step_created ON transitions(step_id, created_at, id);
CREATE INDEX idx_transitions_note ON transitions(note_id);
