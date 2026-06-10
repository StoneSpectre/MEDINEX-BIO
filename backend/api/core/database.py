from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from api.core.config import settings

# Create the async engine
# Note: we use SQLite for local tests, but PostgreSQL handles ENUMs and JSONB natively.
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Create an async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False, 
    autoflush=False
)

# Declarative base for the ORM models
Base = declarative_base()

# FastAPI Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
