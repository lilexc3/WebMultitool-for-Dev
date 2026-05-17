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
  server_dashboard_mode TEXT NOT NULL DEFAULT 'standard',
  server_dashboard_url TEXT,
  site_dashboard_mode TEXT NOT NULL DEFAULT 'standard',
  site_dashboard_url TEXT
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

CREATE TABLE IF NOT EXISTS site_nodes (
    id BIGSERIAL PRIMARY KEY,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    agent_token TEXT UNIQUE NOT NULL,
    vps_ip TEXT,
    agent_connected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_nodes_site ON site_nodes(site_id);
CREATE INDEX IF NOT EXISTS idx_site_nodes_token ON site_nodes(agent_token);

CREATE TABLE IF NOT EXISTS node_services (
    id BIGSERIAL PRIMARY KEY,
    node_id BIGINT NOT NULL REFERENCES site_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    repo_url TEXT,
    deploy_path TEXT,
    build_command TEXT,
    restart_command TEXT,
    docker_compose BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_node_services_node ON node_services(node_id);

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    node_id BIGINT REFERENCES site_nodes(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES users(id),
    action TEXT NOT NULL,
    node_name TEXT,
    services_count INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_site ON activity_logs(site_id, created_at DESC);
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