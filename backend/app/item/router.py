# app/item/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.schemas import item as item_schemas
from app.item import service as item_service

router = APIRouter(
    tags=["Items"],
    prefix="/items",
)

@router.get("/{item_id}", response_model=item_schemas.ItemRead)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific item by its ID.
    """
    item = await item_service.item_service.get_item_by_id(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item

# Add other item-related endpoints here (e.g., list, create, update, delete) later if needed.

