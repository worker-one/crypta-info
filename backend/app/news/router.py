# app/news/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_async_db
from app.news import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse

router = APIRouter(
    prefix="/news",
    tags=["News"]
)

@router.get("/", response_model=PaginatedResponse[schemas.NewsItemRead])
async def list_news(
    db: AsyncSession = Depends(get_async_db),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of news items, newest first.
    """
    news_items, total = await service.news_service.list_news_items(db=db, pagination=pagination)
    return PaginatedResponse(
        total=total,
        items=news_items,
        skip=pagination.skip,
        limit=pagination.limit,
    )

@router.get("/{news_id}", response_model=schemas.NewsItemRead)
async def get_news_item(
    news_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get details of a specific news item.
    """
    db_news = await service.news_service.get_news_item_by_id(db=db, news_id=news_id)
    if db_news is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News item not found")
    return db_news

# Add POST, PUT, DELETE endpoints here, likely protected by admin dependency