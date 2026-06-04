from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create engine for SQLite
# check_same_thread=False is needed only for SQLite because it's single-threaded by default
# but FastAPI can query it across multiple threads.
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency to get a DB session.
    Yields the session and closes it after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
