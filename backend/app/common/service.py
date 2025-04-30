# app/common/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import logging

from app.models import common as common_models

# Get logger
logger = logging.getLogger(__name__)

class CommonService:
    async def get_all_countries(self, db: AsyncSession) -> List[common_models.Country]:
        """Retrieve all countries from the database."""
        logger.info("Retrieving all countries from the database.")
        result = await db.execute(select(common_models.Country).order_by(common_models.Country.name))
        countries = result.scalars().all()
        logger.info(f"Retrieved {len(countries)} countries.")
        return countries

    async def get_country_by_id(self, db: AsyncSession, country_id: int) -> Optional[common_models.Country]:
        """Retrieve a single country by its ID."""
        logger.info(f"Retrieving country with id {country_id}.")
        result = await db.execute(select(common_models.Country).filter(common_models.Country.id == country_id))
        country = result.scalars().first()
        logger.info(f"Country with id {country_id} {'found' if country else 'not found'}.")
        return country

    async def get_all_fiat_currencies(self, db: AsyncSession) -> List[common_models.FiatCurrency]:
        """Retrieve all fiat currencies from the database."""
        logger.info("Retrieving all fiat currencies from the database.")
        result = await db.execute(select(common_models.FiatCurrency).order_by(common_models.FiatCurrency.name))
        currencies = result.scalars().all()
        logger.info(f"Retrieved {len(currencies)} fiat currencies.")
        return currencies

    async def get_fiat_currency_by_id(self, db: AsyncSession, currency_id: int) -> Optional[common_models.FiatCurrency]:
        """Retrieve a single fiat currency by its ID."""
        logger.info(f"Retrieving fiat currency with id {currency_id}.")
        result = await db.execute(select(common_models.FiatCurrency).filter(common_models.FiatCurrency.id == currency_id))
        currency = result.scalars().first()
        logger.info(f"Fiat currency with id {currency_id} {'found' if currency else 'not found'}.")
        return currency

common_service = CommonService()
