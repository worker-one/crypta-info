import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

# Adjust imports based on your project structure
from app.core.database import AsyncSessionFactory, engine, Base
from app.models.common import FiatCurrency # Adjust this import to your FiatCurrency model location

async def seed_fiat_currencies(db: AsyncSession):
    """Seeds the database with initial fiat currencies."""

    currencies_to_seed = [
        {"code_iso_4217": "USD", "name": "US Dollar"},
        {"code_iso_4217": "EUR", "name": "Euro"},
        {"code_iso_4217": "RUB", "name": "Russian Ruble"},
        {"code_iso_4217": "GBP", "name": "British Pound"},
        {"code_iso_4217": "JPY", "name": "Japanese Yen"},
        {"code_iso_4217": "CNY", "name": "Chinese Yuan"},
        {"code_iso_4217": "UAH", "name": "Ukrainian Hryvnia"}, # Added example
        {"code_iso_4217": "KZT", "name": "Kazakhstani Tenge"},
        {"code_iso_4217": "INR", "name": "Indian Rupee"},
        {"code_iso_4217": "BRL", "name": "Brazilian Real"},
        {"code_iso_4217": "AUD", "name": "Australian Dollar"},
        {"code_iso_4217": "CAD", "name": "Canadian Dollar"},
        {"code_iso_4217": "CHF", "name": "Swiss Franc"},
        {"code_iso_4217": "NZD", "name": "New Zealand Dollar"},
    ]

    print("Seeding fiat currencies...")
    added_count = 0
    for currency_data in currencies_to_seed:
        # Check if currency already exists by code
        exists_query = select(FiatCurrency).filter(FiatCurrency.code_iso_4217 == currency_data["code_iso_4217"])
        result = await db.execute(exists_query)
        if result.scalar_one_or_none() is None:
            # Currency does not exist, create it
            new_currency = FiatCurrency(
                code_iso_4217=currency_data["code_iso_4217"],
                name=currency_data.get("name") # Use .get if name is optional
            )
            db.add(new_currency)
            try:
                # Optional: await db.flush() to catch errors earlier
                print(f"  Adding currency: {currency_data['code_iso_4217']} ({currency_data.get('name', 'N/A')})")
                added_count += 1
            except IntegrityError:
                await db.rollback()
                print(f"  Skipping currency (already exists or conflict): {currency_data['code_iso_4217']}")
            except Exception as e:
                await db.rollback()
                print(f"  Error adding currency {currency_data['code_iso_4217']}: {e}")
        else:
            print(f"  Skipping currency (already exists): {currency_data['code_iso_4217']}")

    if added_count > 0:
        try:
            await db.commit()
            print(f"Successfully added {added_count} new fiat currencies.")
        except Exception as e:
            await db.rollback()
            print(f"Error committing seeded currencies: {e}")
    else:
        print("No new fiat currencies were added.")


async def main():
    """Initializes database and runs the seeding function."""
    # Optional: Create tables if they don't exist
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionFactory() as session:
        await seed_fiat_currencies(session)

if __name__ == "__main__":
    # Ensure your database connection string is configured correctly
    # where AsyncSessionFactory is defined.
    print("Running fiat currency seeding script...")
    asyncio.run(main())
    print("Seeding script finished.")