import os
from pathlib import Path
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# DB_PATH env var wins (set in Docker); fall back to project-relative path for local dev
_env = os.environ.get("DB_PATH")
if _env:
    DB_PATH = Path(_env)
else:
    # src/aai_pipeline/database.py → 3 parents → project root
    DB_PATH = Path(__file__).parent.parent.parent / "data" / "pipeline.db"

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    from aai_pipeline import models  # noqa: F401 — ensure models are registered
    Base.metadata.create_all(bind=engine)


def reset_db() -> None:
    """Drop all tables and recreate them (wipes all data)."""
    from aai_pipeline import models  # noqa: F401 — ensure models are registered
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
