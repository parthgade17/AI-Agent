"""
PostgreSQL connection handling for the CSE Department AI Agent.

Set DATABASE_URL in .env, for example:
    DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/cse_agent

Create the database and tables once:
    createdb cse_agent
    psql -d cse_agent -f schema.sql
"""
import os

from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cse_agent"
)

# A small pool is plenty for a prototype. open=False so import never blocks;
# the first query opens the connection.
pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=5, open=False, kwargs={"row_factory": dict_row})


def query_one(sql: str, params: tuple = ()) -> dict | None:
    """Run a SELECT and return the first row as a dict, or None."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def query_all(sql: str, params: tuple = ()) -> list[dict]:
    """Run a SELECT and return every row."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def execute(sql: str, params: tuple = ()) -> dict | None:
    """Run an INSERT/UPDATE/DELETE. Returns the row when the SQL has RETURNING."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone() if cur.description else None
        conn.commit()
        return row


def check_connection() -> None:
    """Fail fast at startup with a readable message rather than mid-request."""
    try:
        pool.open()
        query_one("SELECT 1 AS ok")
    except Exception as e:
        raise RuntimeError(
            f"Cannot connect to PostgreSQL at {DATABASE_URL.split('@')[-1]}.\n"
            f"Check that the server is running and DATABASE_URL in .env is correct.\n"
            f"Original error: {e}"
        ) from e
