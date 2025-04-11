# app/admin/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_async_db
from app.admin.dependencies import AdminUser # Use the re-exported dependency
from app.models.user import User
from app.schemas.common import Message, PaginationParams, PaginatedResponse

# Import services and schemas from other modules
from app.auth import service as auth_service
from app.auth import schemas as auth_schemas
# app/exchanges/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_async_db
from app.exchanges import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse
from app.models.exchange import KYCTypeEnum
from app.dependencies import get_current_admin_user
from app.models.user import User
from app.reviews import service as review_service
from app.reviews import schemas as review_schemas
from app.models import review as review_models
from app.news import service as news_service
from app.news import schemas as news_schemas
from app.static_pages import service as static_page_service
from app.static_pages import schemas as static_page_schemas


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[AdminUser] # Apply admin check to all routes in this router
)

# --- User Management ---
@router.get("/users", response_model=List[auth_schemas.UserRead]) # Add pagination later
async def admin_list_users(
    db: AsyncSession = Depends(get_async_db),
    # pagination: PaginationParams = Depends(), # Add pagination
):
    """
    (Admin) List all users.
    """
    # Implement user listing logic in auth_service if needed
    # For now, basic select all (limit in production!)
    users = await db.execute(auth_service.select(User).limit(100))
    return users.scalars().all()

@router.patch("/users/{user_id}/block", response_model=Message)
async def admin_block_user(user_id: int, db: AsyncSession = Depends(get_async_db)):
    """
    (Admin) Block a user (requires adding 'is_active' field to User model).
    """
    # Implementation depends on adding is_active to User model
    # user = await auth_service.get_user_by_id(db, user_id)
    # if not user: raise HTTPException(404)
    # user.is_active = False
    # await db.commit()
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
    # return Message(message="User blocked successfully")


# --- Exchange Management ---

@router.post("/exchanges", response_model=schemas.ExchangeRead, status_code=status.HTTP_201_CREATED)
async def create_exchange(
    exchange_in: schemas.ExchangeCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Create a new exchange (admin only).
    """
    print("BLAH")
    try:
        db_exchange = await service.exchange_service.create_exchange(db=db, exchange_in=exchange_in)
        return db_exchange
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/exchanges/{slug}", response_model=schemas.ExchangeRead)
async def update_exchange(
    slug: str,
    exchange_in: schemas.ExchangeUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Update an existing exchange by slug (admin only).
    """
    db_exchange = await service.exchange_service.get_exchange_by_slug(db, slug=slug)
    if db_exchange is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")
    
    try:
        updated_exchange = await service.exchange_service.update_exchange(db=db, db_exchange=db_exchange, exchange_in=exchange_in)
        return updated_exchange
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/exchanges/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exchange(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Delete an exchange by slug (admin only).
    """
    db_exchange = await service.exchange_service.get_exchange_by_slug(db, slug=slug)
    if db_exchange is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")
    
    await service.exchange_service.delete_exchange(db=db, exchange_id=db_exchange.id)
    return None

# Add PUT/PATCH/DELETE for exchanges

# --- Review Moderation ---
@router.get("/reviews/pending", response_model=PaginatedResponse[review_schemas.ReviewRead])
async def admin_list_pending_reviews(
    db: AsyncSession = Depends(get_async_db),
    pagination: PaginationParams = Depends(),
    sort_by: review_schemas.ReviewSortBy = Depends(), # Can reuse sorting
):
    """
    (Admin) List reviews pending moderation.
    """
    filters = review_schemas.ReviewFilterParams(moderation_status=review_models.ModerationStatusEnum.pending)
    reviews, total = await review_service.review_service.list_reviews(
        db=db, filters=filters, sort=sort_by, pagination=pagination
    )
    return PaginatedResponse(total=total, items=reviews, skip=pagination.skip, limit=pagination.limit)


@router.patch("/reviews/{review_id}/moderate", response_model=review_schemas.ReviewRead)
async def admin_moderate_review(
    review_id: int,
    moderation_data: review_schemas.ReviewUpdateAdmin,
    db: AsyncSession = Depends(get_async_db),
    current_admin: User = AdminUser # Inject admin user to log who moderated
):
    """
    (Admin) Approve or reject a review.
    """
    updated_review = await review_service.review_service.moderate_review(
        db=db,
        review_id=review_id,
        moderation_data=moderation_data,
        moderator_id=current_admin.id
    )
    if not updated_review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return updated_review

# --- News Management ---
@router.post("/news", response_model=news_schemas.NewsItemRead, status_code=status.HTTP_201_CREATED)
async def admin_create_news(
    news_in: news_schemas.NewsItemCreate,
    db: AsyncSession = Depends(get_async_db),
    current_admin: User = AdminUser
):
    """
    (Admin) Create a news item.
    """
    db_news = await news_service.news_service.create_news_item(db=db, news_in=news_in, creator_id=current_admin.id)
    return db_news

# Add PUT/DELETE for news

# --- Static Page Management ---
@router.post("/static-pages", response_model=static_page_schemas.StaticPageRead, status_code=status.HTTP_201_CREATED)
async def admin_create_static_page(
    page_in: static_page_schemas.StaticPageCreate,
    db: AsyncSession = Depends(get_async_db),
    current_admin: User = AdminUser
):
    """
    (Admin) Create a static content page.
    """
    try:
        db_page = await static_page_service.static_page_service.create_page(db=db, page_in=page_in, user_id=current_admin.id)
        return db_page
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/static-pages/{slug}", response_model=static_page_schemas.StaticPageRead)
async def admin_update_static_page(
    slug: str,
    page_in: static_page_schemas.StaticPageUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_admin: User = AdminUser
):
    """
    (Admin) Update a static content page.
    """
    db_page = await static_page_service.static_page_service.get_page_by_slug(db=db, slug=slug)
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Static page not found")
    try:
        updated_page = await static_page_service.static_page_service.update_page(
            db=db, db_page=db_page, page_in=page_in, user_id=current_admin.id
        )
        return updated_page
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))