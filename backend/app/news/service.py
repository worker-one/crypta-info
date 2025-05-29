# app/news/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload
from typing import List, Tuple, Optional

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
        exchange_id: Optional[int] = None # Added exchange_id parameter
    ) -> Tuple[List[news_models.NewsItem], int]:
        query = select(news_models.NewsItem).options(
            selectinload(news_models.NewsItem.exchanges) 
        )
        
        base_query_stmt = select(news_models.NewsItem.id) # For distinct counting

        if exchange_id:
            # Filter by exchange_id using the 'exchanges' relationship
            query = query.join(news_models.NewsItem.exchanges).filter(exchange_models.Exchange.id == exchange_id)
            base_query_stmt = base_query_stmt.join(news_models.NewsItem.exchanges).filter(exchange_models.Exchange.id == exchange_id)

        # Count total items matching the criteria
        count_subquery = base_query_stmt.distinct().subquery()
        count_query = select(func.count()).select_from(count_subquery)
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Apply ordering and pagination for fetching items
        query = query.order_by(desc(news_models.NewsItem.published_at)) # Default sort
        query = query.offset(pagination.skip).limit(pagination.limit)

        result = await db.execute(query)
        # Use .unique() because the join for filtering might create duplicates if a news item is linked to multiple exchanges
        # and we are not filtering by a specific one, or if the selectinload itself causes issues without it.
        # However, if filtering by a single exchange_id, .unique() primarily helps if NewsItem itself is duplicated by the join strategy.
        items = result.scalars().unique().all() 

        return items, total

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