# app/reviews/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.core.database import get_async_db
from app.reviews import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse, Message
from app.dependencies import get_current_active_user, get_current_admin_user, get_optional_current_active_user  # Assuming get_optional_current_active_user exists
from app.models.user import User
from app.models.review import ModerationStatusEnum
from app.reviews.schemas import ItemReviewCreate, ReviewAdminUpdatePayload

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

CurrentUser = User  # Alias for readability

@router.get("/", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_all_approved_reviews(
    db: AsyncSession = Depends(get_async_db),
    item_id: Optional[int] = Query(None, description="Filter by item ID (e.g., exchange, wallet)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    max_rating: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    has_screenshot: Optional[bool] = Query(None, description="Filter by presence of screenshots"),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of all *approved* reviews with filtering, sorting, and pagination.
    Can be filtered by item_id.
    """
    filters = schemas.ReviewFilterParams(
        item_id=item_id,
        user_id=user_id,
        min_rating=min_rating,
        max_rating=max_rating,
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
    item_id: Optional[int] = Query(None, description="Filter by item ID"),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of all reviews submitted by the current authenticated user.
    Can be filtered by moderation status and item_id.
    """
    filter_data = {
        "user_id": current_user.id,
        **({"moderation_status": moderation_status} if moderation_status is not None else {}),
        **({"item_id": item_id} if item_id is not None else {}),
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

@router.get("/item/{item_id}", response_model=PaginatedResponse[schemas.ReviewRead])
async def list_reviews_for_item(
    item_id: int,
    db: AsyncSession = Depends(get_async_db),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    max_rating: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    has_screenshot: Optional[bool] = Query(None),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of *approved* reviews for a specific item (e.g., exchange, wallet).
    """
    filters = schemas.ReviewFilterParams(
        item_id=item_id,
        min_rating=min_rating,
        max_rating=max_rating,
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


@router.post("/item/{item_id}", response_model=schemas.ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review_for_item(
    item_id: int,
    review_in: ItemReviewCreate = Body(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: Optional[User] = Depends(get_optional_current_active_user),  # User is now optional
):
    """
    Create a new review for a specific item.
    - If 'guest_name' is provided in the payload, the user must NOT be authenticated.
    - If 'guest_name' is NOT provided, the user MUST be authenticated.
    """
    if review_in.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID in path does not match item ID in request body."
        )

    user_id_for_service: Optional[int] = None

    if review_in.guest_name:
        # Guest review
        if current_user:
            # Authenticated user trying to submit as guest
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authenticated users cannot submit reviews with guest_name. Please omit guest_name."
            )
        # user_id_for_service remains None, service layer will use review_in.guest_name
    else:
        # Authenticated user review (guest_name is not provided)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication is required to submit a review without providing guest_name."
            )
        user_id_for_service = current_user.id

    try:
        created_review = await service.review_service.create_review(
            db=db, review_in=review_in, user_id=user_id_for_service
        )
        return created_review
    except HTTPException as e:
        raise e
    except IntegrityError as e:
        print(f"Database integrity error while creating review: {e}")  # Log for debugging
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This review cannot be created, possibly due to a duplicate entry or data conflict."
        )
    except Exception as e:
        print(f"Unexpected error creating review: {e}")  # Log for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while creating the review.")


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
    item_id: Optional[int] = Query(None, description="Filter by item ID"),
    user_id: Optional[int] = Query(None),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    has_screenshot: Optional[bool] = Query(None),
    moderation_status: Optional[ModerationStatusEnum] = Query(None),
    sort_by: schemas.ReviewSortBy = Depends(),
    pagination: PaginationParams = Depends(),
):
    """
    Retrieve all reviews (pending, approved, rejected) for admin management
    with filtering, sorting, and pagination. Can be filtered by item_id.
    """
    filter_data = {
        "item_id": item_id,
        "user_id": user_id,
        "min_rating": min_rating,
        "max_rating": max_rating,
        "has_screenshot": has_screenshot,
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
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Update the status and/or moderator notes of a review.
    Requires admin privileges.
    """
    if status_update.moderation_status is None and status_update.moderator_notes is None:
        if status_update.moderator_notes != "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field (moderation_status or moderator_notes) must be provided for update.",
            )


    updated_review = await service.review_service.update_review_moderation_details(
        db=db,
        review_id=review_id,
        update_payload=status_update,
        moderator_id=current_admin.id
    )

    if not updated_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    return updated_review

router.include_router(admin_router)