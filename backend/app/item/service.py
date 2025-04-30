# app/item/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import logging

from app.models import item as item_models

# Get logger
logger = logging.getLogger(__name__)

class ItemService:
    async def get_item_by_id(self, db: AsyncSession, item_id: int) -> Optional[item_models.Item]:
        """Retrieve a single item by its ID."""
        logger.info(f"Retrieving item with id {item_id}.")
        result = await db.execute(select(item_models.Item).filter(item_models.Item.id == item_id))
        item = result.scalars().first()
        logger.info(f"Item with id {item_id} {'found' if item else 'not found'}.")
        return item

item_service = ItemService()

