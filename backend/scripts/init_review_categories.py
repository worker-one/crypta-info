import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

# Adjust imports based on your project structure
from app.core.database import AsyncSessionFactory, engine, Base
from app.models.common import RatingCategory # Import the model

async def seed_rating_categories(db: AsyncSession):
    """Seeds the database with initial rating categories."""

    categories_to_seed = [
        {"name": "Удобство интерфейса (UI/UX)", "description": "Оценка интуитивности, дизайна и общего удобства использования платформы."},
        {"name": "Качество и скорость поддержки", "description": "Оценка работы службы поддержки: скорость ответов, компетентность, доступные каналы связи."},
        {"name": "Безопасность", "description": "Оценка мер безопасности: наличие 2FA, страховой фонд, история взломов, холодное хранение."},
        {"name": "Торговые комиссии", "description": "Оценка размера комиссий Maker/Taker, а также комиссий на ввод и вывод средств."},
        {"name": "Ликвидность и выбор пар", "description": "Оценка доступного количества торговых пар и глубины стакана (ликвидности)."},
        {"name": "Скорость ввода/вывода средств", "description": "Оценка скорости обработки депозитов и снятия средств."},
    ]

    print("Seeding rating categories...")
    added_count = 0
    for category_data in categories_to_seed:
        # Check if category already exists by name
        exists_query = select(RatingCategory).filter(RatingCategory.name == category_data["name"])
        result = await db.execute(exists_query)
        if result.scalar_one_or_none() is None:
            # Category does not exist, create it
            new_category = RatingCategory(
                name=category_data["name"],
                description=category_data.get("description") # Use .get for optional description
            )
            db.add(new_category)
            try:
                # Flush to catch potential unique constraint violations early if needed,
                # but usually committing at the end is fine.
                # await db.flush()
                print(f"  Adding category: {category_data['name']}")
                added_count += 1
            except IntegrityError:
                # Should not happen with the check above, but good practice
                await db.rollback()
                print(f"  Skipping category (already exists or conflict): {category_data['name']}")
            except Exception as e:
                await db.rollback()
                print(f"  Error adding category {category_data['name']}: {e}")
        else:
            print(f"  Skipping category (already exists): {category_data['name']}")

    if added_count > 0:
        try:
            await db.commit()
            print(f"Successfully added {added_count} new rating categories.")
        except Exception as e:
            await db.rollback()
            print(f"Error committing seeded categories: {e}")
    else:
        print("No new rating categories were added.")


async def main():
    """Initializes database and runs the seeding function."""
    # Optional: Create tables if they don't exist (useful for initial setup)
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionFactory() as session:
        await seed_rating_categories(session)

if __name__ == "__main__":
    # This allows running the script directly
    # Ensure your database connection string is configured correctly
    # where async_session_maker is defined.
    print("Running data seeding script...")
    asyncio.run(main())
    print("Seeding script finished.")
