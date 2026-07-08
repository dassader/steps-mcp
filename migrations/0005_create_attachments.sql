CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),
  content_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (content_kind IN ('none', 'text', 'blob', 'link')),
  text_content TEXT,
  blob_content BLOB,
  link_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX idx_attachments_note_created ON attachments(note_id, created_at, id);
