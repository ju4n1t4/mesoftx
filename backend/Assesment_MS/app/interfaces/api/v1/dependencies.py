from collections.abc import Generator

from sqlalchemy.orm import Session

from app.infrastructure.database.session import get_db


def db_session() -> Generator[Session, None, None]:
    yield from get_db()
