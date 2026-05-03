# backend/app/database.py
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, Iterator, Optional

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/dbname)")


_pool: Optional[ConnectionPool] = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=int(os.getenv("DB_POOL_MIN", "1")),
            max_size=int(os.getenv("DB_POOL_MAX", "10")),
            kwargs={"row_factory": dict_row},
        )
    return _pool


@contextmanager
def db_conn():
    """Контекст подключения из пула."""
    pool = get_pool()
    with pool.connection() as conn:
        yield conn


@contextmanager
def db_cursor():
    """Курсор в транзакции. Коммит/роллбек автоматически."""
    with db_conn() as conn:
        with conn.cursor() as cur:
            try:
                yield cur
                conn.commit()
            except Exception:
                conn.rollback()
                raise


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  github_token TEXT,
  gitlab_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  git_repo_url TEXT,
  deploy_key TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status INTEGER,
  last_check TIMESTAMPTZ,
  agent_token TEXT UNIQUE,
  agent_connected BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sites_user_created ON sites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(active);

CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ
);
"""


def init_database() -> None:
    """Инициализация схемы БД (идемпотентно)."""
    with db_cursor() as cur:
        cur.execute(SCHEMA_SQL)


def fetch_one(query: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(query, params or ())
        return cur.fetchone()


def fetch_all(query: str, params: Optional[tuple] = None) -> list[Dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(query, params or ())
        return list(cur.fetchall())


def execute(query: str, params: Optional[tuple] = None) -> None:
    with db_cursor() as cur:
        cur.execute(query, params or ())


def execute_returning_id(query: str, params: Optional[tuple] = None) -> int:
    with db_cursor() as cur:
        cur.execute(query, params or ())
        row = cur.fetchone()
        if not row or "id" not in row:
            raise RuntimeError("RETURNING id expected")
        return int(row["id"])