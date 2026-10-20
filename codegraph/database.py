from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, prompt TEXT NOT NULL,
  status TEXT NOT NULL, workspace TEXT NOT NULL, created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dependencies (
  source_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (source_id, target_id)
);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL, parent_id TEXT,
  name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL,
  task TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
  run_id TEXT, agent_id TEXT, type TEXT NOT NULL, message TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
  category TEXT NOT NULL, author TEXT NOT NULL, content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
  module_id TEXT, path TEXT NOT NULL, owner_agent_id TEXT, sha256 TEXT NOT NULL,
  size INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(project_id, path)
);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
"""


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._lock = threading.RLock()
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=20)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        with self._lock, self.connect() as connection:
            connection.execute(sql, params)

    def many(self, sql: str, rows: list[tuple[Any, ...]]) -> None:
        with self._lock, self.connect() as connection:
            connection.executemany(sql, rows)

    def one(self, sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(sql, params).fetchone()
            return dict(row) if row else None

    def all(self, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(sql, params).fetchall()]

    def event(self, project_id: str, event_type: str, message: str, *, run_id: str | None = None,
              agent_id: str | None = None, metadata: dict[str, Any] | None = None) -> None:
        self.execute(
            "INSERT INTO events(project_id,run_id,agent_id,type,message,metadata,created_at) VALUES(?,?,?,?,?,?,?)",
            (project_id, run_id, agent_id, event_type, message, json.dumps(metadata or {}), now()),
        )

