
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.models.base import Base

# Create async engine instance
engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False) # Set echo=True for debugging SQL

# Create sessionmaker
AsyncSessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

# Init database schema via Base.metadata.create_all
async def init_db() -> None:
    try:
        async with engine.begin() as conn:
            # This will create all tables defined in the Base's subclasses
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        await engine.dispose()
        
if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
    print("Database initialized successfully.")