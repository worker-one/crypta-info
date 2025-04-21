# app/guides/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple

# Assuming guide models exist similar to news models
from app.models import guide as guide_models
from app.models import exchange as exchange_models
from app.guides import schemas as guide_schemas # Renamed alias
from app.schemas.common import PaginationParams

class GuideService: # Renamed class

    async def get_guide_item_by_id(self, db: AsyncSession, guide_id: int) -> Optional[guide_models.GuideItem]: # Renamed method and parameter
        query = select(guide_models.GuideItem).options( # Use GuideItem
            selectinload(guide_models.GuideItem.exchange) # Eager load related exchange
        ).filter(guide_models.GuideItem.id == guide_id) # Use GuideItem
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_guide_items( # Renamed method
        self,
        db: AsyncSession,
        pagination: PaginationParams,
        exchange_id: Optional[int] = None # Add exchange_id parameter
    ) -> Tuple[List[guide_models.GuideItem], int]: # Use GuideItem
        """
        Retrieves a paginated list of guide items, optionally filtered by exchange_id.
        """
        # Base query
        stmt = select(guide_models.GuideItem).order_by(desc(guide_models.GuideItem.published_at))
        count_stmt = select(func.count()).select_from(guide_models.GuideItem)

        # Apply exchange filter if provided
        if exchange_id is not None:
            stmt = stmt.where(guide_models.GuideItem.exchange_id == exchange_id)
            count_stmt = count_stmt.where(guide_models.GuideItem.exchange_id == exchange_id)

        # Apply pagination
        stmt = stmt.offset(pagination.skip).limit(pagination.limit)

        # Eager load relationships if needed
        stmt = stmt.options(
            selectinload(guide_models.GuideItem.exchange).selectinload(exchange_models.Exchange.registration_country)
        )

        # Execute queries
        result = await db.execute(stmt)
        guide_items = result.scalars().unique().all() # Renamed variable, Use unique() because of M2M join
        total_count_result = await db.execute(count_stmt)
        total = total_count_result.scalar_one()

        return guide_items, total # Return renamed variable

    async def create_guide_item( # Renamed method
        self,
        db: AsyncSession,
        guide_in: guide_schemas.GuideItemCreate, # Use GuideItemCreate
        creator_id: Optional[int] = None # Optional if created by system/admin
    ) -> guide_models.GuideItem: # Use GuideItem
        db_guide = guide_models.GuideItem( # Renamed variable, Use GuideItem
            **guide_in.model_dump(exclude={"exchange_ids"}),
            created_by_user_id=creator_id
        )

        if guide_in.exchange_ids:
            exchange = await db.execute(
                select(exchange_models.Exchange).filter(exchange_models.Exchange.id.in_(guide_in.exchange_ids))
            )
            db_guide.exchange.extend(exchange.scalars().all()) # Use renamed variable

        db.add(db_guide) # Use renamed variable
        await db.commit()
        await db.refresh(db_guide, attribute_names=['exchange']) # Use renamed variable
        return db_guide # Return renamed variable

    # Add update and delete methods similarly (likely admin only)

guide_service = GuideService() # Renamed instance