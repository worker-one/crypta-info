# app/common/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
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

    async def get_all_fiat_currencies(self, db: AsyncSession) -> List[common_models.FiatCurrency]:
        """Retrieve all fiat currencies from the database."""
        logger.info("Retrieving all fiat currencies from the database.")
        result = await db.execute(select(common_models.FiatCurrency).order_by(common_models.FiatCurrency.name))
        currencies = result.scalars().all()
        logger.info(f"Retrieved {len(currencies)} fiat currencies.")
        return currencies

common_service = CommonService()
