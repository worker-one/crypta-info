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

def fetch_exchanges_all_pages(start_page=1, end_page=5):
    all_exchanges = []
    for page in range(start_page, end_page + 1):
        params = {
            "per_page": 100,  # Max per page
            "page": page,
        }
        resp = requests.get(COINGECKO_URL, headers=HEADERS, params=params)
        resp.raise_for_status()
        exchanges = resp.json()
        if not exchanges:
            break
        all_exchanges.extend(exchanges)
    return all_exchanges

def map_api_to_exchange(api_data):
    return {
        "name": api_data.get("name"),
        "slug": api_data.get("id"),
        "description": api_data.get("description"),
        "logo_url": api_data.get("image"),
        "website_url": api_data.get("url"),
        "trading_volume_24h": api_data.get("trade_volume_24h_btc")*107500
    }

async def upsert_exchange(session, data):
    # Try to find by slug
    stmt = select(Exchange).where(Exchange.slug == data["slug"])
    result = await session.execute(stmt)
    exchange = result.scalar_one_or_none()
    if exchange:
        for k, v in data.items():
            setattr(exchange, k, v)
        # Update the updated_at timestamp
        exchange.updated_at = func.now()
    else:
        exchange = Exchange(**data)
        session.add(exchange)

async def main():
    await init_db()
    # Check if exchanges.json already exists
    exchanges = fetch_exchanges_all_pages(1, 5)
    print(f"Fetched {len(exchanges)} exchanges from CoinGecko API.")
    async with AsyncSessionFactory() as session:
        for api_ex in exchanges:
            ex_data = map_api_to_exchange(api_ex)
            try:
                await upsert_exchange(session, ex_data)
            except IntegrityError as e:
                print(f"Integrity error for {ex_data['slug']}: {e}")
        await session.commit()
    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(main())
