# app/news/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple

from app.models import news as news_models
from app.models import exchange as exchange_models
from app.news import schemas
from app.schemas.common import PaginationParams

class NewsService:

    async def get_news_item_by_id(self, db: AsyncSession, news_id: int) -> Optional[news_models.NewsItem]:
        query = select(news_models.NewsItem).options(
            selectinload(news_models.NewsItem.exchanges) # Eager load related exchanges
        ).filter(news_models.NewsItem.id == news_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_news_items(
        self,
        db: AsyncSession,
        pagination: PaginationParams,
    ) -> Tuple[List[news_models.NewsItem], int]:
        # Basic listing, newest first. Add filters (e.g., by exchange) if needed.
        query = select(news_models.NewsItem).options(
            selectinload(news_models.NewsItem.exchanges).selectinload(exchange_models.Exchange.registration_country) # Example nested load
        ).order_by(desc(news_models.NewsItem.published_at))

        # Count total
        count_query = select(func.count(news_models.NewsItem.id))
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(pagination.skip).limit(pagination.limit)

        # Execute main query
        result = await db.execute(query)
        news_items = result.scalars().unique().all() # Use unique() because of M2M join

        return news_items, total

    async def create_news_item(
        self,
        db: AsyncSession,
        news_in: schemas.NewsItemCreate,
        creator_id: Optional[int] = None # Optional if created by system/admin
    ) -> news_models.NewsItem:
        db_news = news_models.NewsItem(
            **news_in.model_dump(exclude={"exchange_ids"}),
            created_by_user_id=creator_id
        )

        if news_in.exchange_ids:
            exchanges = await db.execute(
                select(exchange_models.Exchange).filter(exchange_models.Exchange.id.in_(news_in.exchange_ids))
            )
            db_news.exchanges.extend(exchanges.scalars().all())

        db.add(db_news)
        await db.commit()
        await db.refresh(db_news, attribute_names=['exchanges'])
        return db_news

    # Add update and delete methods similarly (likely admin only)

news_service = NewsService()