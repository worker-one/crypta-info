import asyncio
import requests

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

import sys
import os

# Ensure app modules are importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionFactory, init_db
from app.models.exchange import Exchange
from app.models.common import Country

COINGECKO_URL = "https://api.coingecko.com/api/v3/exchanges"
HEADERS = {"accept": "application/json", "x-cg-api-key": "CG-FG5pGMB4HyncXHpq8YzvJ4Eg"}

def fetch_exchanges():
    resp = requests.get(COINGECKO_URL, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

def map_api_to_exchange(api_data, country_id):
    return {
        "name": api_data.get("name"),
        "slug": api_data.get("id"),
        "description": api_data.get("description"),
        "logo_url": api_data.get("image"),
        "website_url": api_data.get("url"),
        "year_founded": api_data.get("year_established"),
        "trading_volume_24h": api_data.get("trade_volume_24h_btc")*107500,
        "registration_country_id": country_id
    }

async def get_country_id_by_name(session, country_name):
    if not country_name:
        return None
    # Try exact match first
    stmt = select(Country).where(Country.name == country_name)
    result = await session.execute(stmt)
    country = result.scalars().first()
    if country:
        return country.id
    # Fuzzy search: case-insensitive and partial match
    stmt = select(Country).where(func.lower(Country.name).like(f"%{country_name.lower()}%"))
    result = await session.execute(stmt)
    country = result.scalars().first()
    return country.id if country else None

async def upsert_exchange(session, data):
    # Try to find by slug
    stmt = select(Exchange).where(Exchange.slug == data["slug"])
    result = await session.execute(stmt)
    exchange = result.scalar_one_or_none()
    if exchange:
        for k, v in data.items():
            setattr(exchange, k, v)
    else:
        exchange = Exchange(**data)
        session.add(exchange)

async def main():
    await init_db()
    # Check if exchanges.json already exists
    if os.path.exists("exchanges.json"):
        with open("exchanges.json", "r") as f:
            import json
            exchanges = json.load(f)
        print("Exchanges data already exists. Skipping fetch.")
    else:
        exchanges = fetch_exchanges()
        # save exhcnages as a json file
        with open("exchanges.json", "w") as f:
            import json
            json.dump(exchanges, f, indent=2)
    print(f"Fetched {len(exchanges)} exchanges from CoinGecko API.")
    async with AsyncSessionFactory() as session:
        for api_ex in exchanges:
            country_name = api_ex.get("country")
            country_id = await get_country_id_by_name(session, country_name)
            ex_data = map_api_to_exchange(api_ex, country_id)
            try:
                await upsert_exchange(session, ex_data)
            except IntegrityError as e:
                print(f"Integrity error for {ex_data['slug']}: {e}")
        await session.commit()
    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(main())
