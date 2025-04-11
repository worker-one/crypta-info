# app/reviews/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_async_db
from app.reviews import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse, Message
from app.dependencies import get_current_active_user, get_current_admin_user # Import dependencies
from app.models.user import User # Import User model
from app.models.review import ModerationStatusEnum # Import Enum

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

CurrentUser = User # Alias for readability

@router.get("/", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_all_approved_reviews(
    db: AsyncSession = Depends(get_async_db),
    # Filtering parameters
    exchange_id: Optional[int] = Query(None, description="Filter by exchange ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    min_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0, description="Minimum overall rating (requires calculation)"),
    max_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0, description="Maximum overall rating (requires calculation)"),
    has_screenshot: Optional[bool] = Query(None, description="Filter by presence of screenshots"),
    # Sorting
    sort_by: schemas.ReviewSortBy = Depends(),
    # Pagination
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of all *approved* reviews with filtering, sorting, and pagination.
    """
    filters = schemas.ReviewFilterParams(
        exchange_id=exchange_id,
        user_id=user_id,
        min_overall_rating=min_overall_rating,
        max_overall_rating=max_overall_rating,
        has_screenshot=has_screenshot,
        moderation_status=ModerationStatusEnum.approved # Hardcoded for this public endpoint
    )

    reviews, total = await service.review_service.list_reviews(
        db=db, filters=filters, sort=sort_by, pagination=pagination
    )

    return PaginatedResponse(
        total=total,
        items=reviews,
        skip=pagination.skip,
        limit=pagination.limit,
    )


@router.get("/exchange/{exchange_id}", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_reviews_for_exchange(
    exchange_id: int,
    db: AsyncSession = Depends(get_async_db),
     # Filtering specific to this exchange's reviews (e.g., rating range)
    min_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    max_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    has_screenshot: Optional[bool] = Query(None),
    # Sorting
    sort_by: schemas.ReviewSortBy = Depends(),
    # Pagination
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of *approved* reviews for a specific exchange.
    """
    # Check if exchange exists first (optional, service might handle)
    # exchange = await exchange_service.get_exchange_by_id(db, exchange_id) # Need exchange_service imported
    # if not exchange:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")

    filters = schemas.ReviewFilterParams(
        exchange_id=exchange_id, # Filter by this exchange
        min_overall_rating=min_overall_rating,
        max_overall_rating=max_overall_rating,
        has_screenshot=has_screenshot,
        moderation_status=ModerationStatusEnum.approved # Only approved reviews
    )

    reviews, total = await service.review_service.list_reviews(
        db=db, filters=filters, sort=sort_by, pagination=pagination
    )

    return PaginatedResponse(
        total=total,
        items=reviews,
        skip=pagination.skip,
        limit=pagination.limit,
    )

@router.post("/exchange/{exchange_id}", response_model=schemas.ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review_for_exchange(
    exchange_id: int, # Get exchange_id from path
    review_in: schemas.ReviewCreate, # Pass ratings/comment in body
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_active_user) # Require login
):
    """
    Create a new review for a specific exchange. Requires authentication.
    """
    # Override or ensure exchange_id from path matches payload if needed
    if review_in.exchange_id != exchange_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exchange ID in path does not match payload")

    # Add CAPTCHA check here if implementing

    try:
        created_review = await service.review_service.create_review(
            db=db, review_in=review_in, user_id=current_user.id
        )
        return created_review
    except HTTPException as e:
        raise e # Re-raise existing HTTP exceptions
    except Exception as e:
        # Log the error e
        print(f"Error creating review: {e}") # Basic logging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create review")


@router.post("/{review_id}/vote", response_model=schemas.ReviewRead)
async def vote_on_review(
    review_id: int,
    vote_in: schemas.ReviewUsefulnessVoteCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_active_user) # Require login
):
    """
    Vote on the usefulness of a review. Requires authentication.
    """
    updated_review = await service.review_service.vote_review_usefulness(
        db=db,
        review_id=review_id,
        user_id=current_user.id,
        is_useful=vote_in.is_useful
    )
    if not updated_review:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or cannot be voted on")
    return updated_review


# Add endpoints for getting a single review, deleting a review (user's own), etc.
# Add moderation endpoints under the /admin router.