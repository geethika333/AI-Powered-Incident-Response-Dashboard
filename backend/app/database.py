"""
Database connection pool management for PostgreSQL.
"""

import os
from psycopg2 import pool

_connection_pool = None


def get_db_config():
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "dbname": os.getenv("DB_NAME", "security_intel"),
        "user": os.getenv("DB_USER", "secadmin"),
        "password": os.getenv("DB_PASSWORD", "secpassword123"),
    }


def init_pool(minconn=2, maxconn=10):
    """Initialize the connection pool."""
    global _connection_pool
    config = get_db_config()
    _connection_pool = pool.ThreadedConnectionPool(minconn, maxconn, **config)
    print(f"✅ Database pool initialized: {config['host']}:{config['port']}/{config['dbname']}")


def close_pool():
    """Close all connections in the pool."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        print("🔌 Database pool closed")


def get_connection():
    """Get a connection from the pool."""
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized")
    return _connection_pool.getconn()


def release_connection(conn):
    """Return a connection to the pool."""
    if _connection_pool and conn:
        _connection_pool.putconn(conn)


def execute_query(query, params=None, fetch_all=True):
    """Execute a query and return results as list of dicts."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            if fetch_all:
                rows = cur.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            else:
                row = cur.fetchone()
                return dict(zip(columns, row)) if row else None
    finally:
        release_connection(conn)


def execute_scalar(query, params=None):
    """Execute a query and return a single scalar value."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            result = cur.fetchone()
            return result[0] if result else None
    finally:
        release_connection(conn)
