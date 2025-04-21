# app/guides/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_async_db
from app.guides import schemas as guide_schemas, service as guide_service
from app.schemas.common import PaginationParams, PaginatedResponse

router = APIRouter(
    prefix="/guides",
    tags=["Guides"]
)

@router.get("/", response_model=PaginatedResponse[guide_schemas.GuideItemRead])
async def list_guides(
    db: AsyncSession = Depends(get_async_db),
    pagination: PaginationParams = Depends(),
    exchange_id: Optional[int] = Query(None, description="Filter guides by exchange ID")
):
    """
    Get a list of guide items, newest first. Optionally filter by exchange_id.
    """
    guide_items, total = await guide_service.guide_service.list_guide_items(
        db=db,
        pagination=pagination,
        exchange_id=exchange_id
    )
    return PaginatedResponse(
        total=total,
        items=guide_items,
        skip=pagination.skip,
        limit=pagination.limit,
    )

@router.get("/{guide_id}", response_model=guide_schemas.GuideItemRead)
async def get_guide_item(
    guide_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get details of a specific guide item.
    """
    db_guide = await guide_service.guide_service.get_guide_item_by_id(db=db, guide_id=guide_id)
    if db_guide is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide item not found")
    return db_guide

# Add POST, PUT, DELETE endpoints here, likely protected by admin dependency