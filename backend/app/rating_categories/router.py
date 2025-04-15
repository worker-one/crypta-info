from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_async_db
from app.rating_categories.service import rating_category_service
# Assuming schemas are in reviews, adjust import if moved to common
from app.reviews.schemas import RatingCategoryRead, RatingCategoryCreate, RatingCategoryUpdate
from app.schemas.common import Message # Assuming Message schema exists
from app.dependencies import get_current_admin_user # Dependency for admin routes

# Public Router
router = APIRouter(
    prefix="/rating-categories",
    tags=["Rating Categories"]
)

# Admin Router
admin_router = APIRouter(
    prefix="/admin/rating-categories",
    tags=["Admin Rating Categories"],
    dependencies=[Depends(get_current_admin_user)] # Secure all admin routes
)

@router.get("/", response_model=List[RatingCategoryRead])
async def list_rating_categories(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a list of all available rating categories.
    """
    categories = await rating_category_service.list_rating_categories(db)
    return categories

@admin_router.post("/", response_model=RatingCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_rating_category(
    category_in: RatingCategoryCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new rating category (Admin only).
    """
    try:
        return await rating_category_service.create_rating_category(db, category_in)
    except HTTPException as e:
        raise e # Re-raise validation/conflict errors
    except Exception as e:
        # Log the error e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create rating category")

@admin_router.get("/{category_id}", response_model=RatingCategoryRead)
async def get_rating_category(
    category_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific rating category by ID (Admin only).
    """
    category = await rating_category_service.get_rating_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating category not found")
    return category

@admin_router.put("/{category_id}", response_model=RatingCategoryRead)
async def update_rating_category(
    category_id: int,
    category_update: RatingCategoryUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update a rating category (Admin only).
    """
    try:
        updated_category = await rating_category_service.update_rating_category(db, category_id, category_update)
        if not updated_category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating category not found")
        return updated_category
    except HTTPException as e:
        raise e # Re-raise validation/conflict errors
    except Exception as e:
        # Log the error e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update rating category")


@admin_router.delete("/{category_id}", response_model=Message)
async def delete_rating_category(
    category_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a rating category (Admin only).
    Will fail if the category is currently in use.
    """
    try:
        deleted = await rating_category_service.delete_rating_category(db, category_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating category not found")
        return Message(message="Rating category deleted successfully")
    except HTTPException as e:
        # Re-raise conflict or other specific errors from the service
        raise e
    except Exception as e:
        # Log the error e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete rating category")

# Include the admin router in the main router
router.include_router(admin_router)
