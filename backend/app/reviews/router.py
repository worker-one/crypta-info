# app/reviews/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError  # Import IntegrityError if checking for DB constraints
from typing import Optional, List

from app.core.database import get_async_db
from app.reviews import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse, Message
from app.dependencies import get_current_user, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.review import ModerationStatusEnum, Review
from app.reviews.schemas import ExchangeReviewCreate, ReviewAdminUpdatePayload

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

CurrentUser = User  # Alias for readability

@router.get("/", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_all_approved_reviews(
    db: AsyncSession = Depends(get_async_db),
    exchange_id: Optional[int] = Query(None, description="Filter by exchange ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    min_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0, description="Minimum overall rating (requires calculation)"),
    max_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0, description="Maximum overall rating (requires calculation)"),
    has_screenshot: Optional[bool] = Query(None, description="Filter by presence of screenshots"),
    sort_by: schemas.ReviewSortBy = Depends(),
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
        moderation_status=ModerationStatusEnum.approved
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

@router.get("/me", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_my_reviews(
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_active_user),
    moderation_status: Optional[ModerationStatusEnum] = Query(None, description="Filter by moderation status"),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of all reviews submitted by the current authenticated user.
    """
    filter_data = {
        "user_id": current_user.id,
        # Only include moderation_status if it's provided in the query
        **({"moderation_status": moderation_status} if moderation_status is not None else {}),
    }
    filters = schemas.ReviewFilterParams(**filter_data)

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
    min_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    max_overall_rating: Optional[float] = Query(None, ge=1.0, le=5.0),
    has_screenshot: Optional[bool] = Query(None),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of *approved* reviews for a specific exchange.
    """
    filters = schemas.ReviewFilterParams(
        exchange_id=exchange_id,
        min_overall_rating=min_overall_rating,
        max_overall_rating=max_overall_rating,
        has_screenshot=has_screenshot,
        moderation_status=ModerationStatusEnum.approved
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
    exchange_id: int,
    review_in: ExchangeReviewCreate = Body(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new review for a specific exchange. Requires authentication."""
    if review_in.exchange_id != exchange_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exchange ID in path does not match exchange ID in request body."
        )

    try:
        created_review = await service.review_service.create_review(
            db=db, review_in=review_in, user_id=current_user.id
        )
        return created_review
    except HTTPException as e:
        raise e
    except IntegrityError:  # Catch potential unique constraint violations from the DB
        await db.rollback()  # Rollback the transaction
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a review for this exchange."
        )
    except Exception as e:
        await db.rollback()  # Rollback on generic errors too
        print(f"Error creating review: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create review due to an internal error.")


@router.post("/{review_id}/vote", response_model=schemas.ReviewRead)
async def vote_on_review(
    review_id: int,
    vote_in: schemas.ReviewUsefulnessVoteCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: CurrentUser = Depends(get_current_active_user)
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


admin_router = APIRouter(
    prefix="/admin/reviews",
    tags=["Admin Reviews"],
    dependencies=[Depends(get_current_admin_user)]
)


@admin_router.get("/", response_model=PaginatedResponse[schemas.ReviewRead])
async def get_all_reviews_admin(
    db: AsyncSession = Depends(get_async_db),
    exchange_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    moderation_status: Optional[ModerationStatusEnum] = Query(None),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Retrieve all reviews (pending, approved, rejected) for admin management
    with filtering, sorting, and pagination.
    """
    filter_data = {
        "exchange_id": exchange_id,
        "user_id": user_id,
        # Only include moderation_status if it's provided in the query
        **({"moderation_status": moderation_status} if moderation_status is not None else {}),
    }
    filters = schemas.ReviewFilterParams(**filter_data)


    reviews, total = await service.review_service.list_reviews(
        db=db, filters=filters, sort=sort_by, pagination=pagination
    )

    return PaginatedResponse(
        total=total,
        items=reviews,
        skip=pagination.skip,
        limit=pagination.limit,
    )


@admin_router.put("/{review_id}/status", response_model=schemas.ReviewRead)
async def update_review_status(
    review_id: int = Path(..., description="ID of the review to update"),
    status_update: ReviewAdminUpdatePayload = Body(...),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update the status and/or moderator notes of a review.
    Requires admin privileges.
    """
    if status_update.moderation_status is None and status_update.moderator_notes is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field (moderation_status or moderator_notes) must be provided for update.",
        )

    updated_review = await service.review_service.update_review_moderation_details(
        db=db,
        review_id=review_id,
        new_status=status_update.moderation_status,
        moderator_notes=status_update.moderator_notes
    )

    if not updated_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or update failed")

    return updated_review

router.include_router(admin_router)