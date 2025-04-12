# app/reviews/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from enum import Enum

from app.core.database import get_async_db, get_db
from app.reviews import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse, Message
from app.dependencies import get_current_user  # Import dependencies
from app.dependencies import get_current_active_user, get_admin_user  # Import dependencies
from app.models.user import User # Import User model
from app.models.review import ModerationStatusEnum, Review # Import Enum
from app.reviews.schemas import ExchangeReviewCreate, ExchangeReview, ReviewAdminStatusUpdate

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
async def create_review_for_exchange( #New route
    exchange_id: int,  # Get exchange_id from path
    review_in: ExchangeReviewCreate,  # Pass ratings/comment in body
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),  # Require login
):
    """Create a new review for a specific exchange. Requires authentication."""
    # Check if exchange exists first (optional, service might handle)
    # exchange = await exchange_service.get_exchange_by_id(db, exchange_id) # Need exchange_service imported
    # if not exchange:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")                                                                                                                                                                                                                                                                                                                                                                     
    
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


class ReviewStatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

admin_router = APIRouter(
    prefix="/admin/reviews",
    tags=["Admin Reviews"],
    dependencies=[Depends(get_admin_user)]  # Ensure only admin users can access these routes
)


@admin_router.get("/", response_model=List[schemas.ReviewRead])
async def get_all_reviews(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Retrieve all reviews (pending, approved, rejected) for admin management.
    """
    reviews = await service.review_service.get_all_reviews(db)
    return reviews


@admin_router.put("/{review_id}/status", response_model=schemas.ReviewRead)
async def update_review_status(
    review_id: int = Path(..., description="ID of the review to update"),
    status_update: ReviewAdminStatusUpdate = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update the status of a review.
    """

    # Map string status to ModerationStatusEnum
    status_mapping = {
        "pending": ModerationStatusEnum.pending,
        "approved": ModerationStatusEnum.approved,
        "rejected": ModerationStatusEnum.rejected,
    }
    new_moderation_status = status_mapping.get(status_update.status)

    if new_moderation_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(status_mapping.keys())}",
        )

    updated_review = await service.review_service.update_review_status(db, review_id, new_moderation_status)
    return updated_review

router.include_router(admin_router)
# Add endpoints for getting a single review, deleting a review (user's own), etc.
# Add moderation endpoints under the /admin router.