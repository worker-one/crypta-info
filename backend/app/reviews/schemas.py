# app/reviews/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Any, Literal
from datetime import datetime
from app.models.review import ModerationStatusEnum
from app.auth.schemas import UserRead # Use UserRead to show author info
from app.schemas.common import ItemReadBrief # Import a generic ItemReadBrief

# Missing schema classes
class ReviewFilterParams(BaseModel):
    moderation_status: Optional[ModerationStatusEnum] = None
    item_id: Optional[int] = None
    user_id: Optional[int] = None
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    has_screenshot: Optional[bool] = None

class ReviewSortBy(BaseModel):
    field: Literal['created_at', 'usefulness', 'rating'] = 'created_at'
    direction: Literal['asc', 'desc'] = 'desc'

class ReviewAdminUpdatePayload(BaseModel):
    moderation_status: Optional[ModerationStatusEnum] = None
    moderator_notes: Optional[str] = None

# Renamed from ExchangeReviewCreate
class ItemReviewCreate(BaseModel):
    item_id: int # Renamed from exchange_id
    rating: int = Field(..., ge=1, le=5) # Single rating value
    comment: Optional[str] = Field(None, min_length=3, max_length=5000)
    moderation_status: Optional[ModerationStatusEnum] = Field(None, description="Set to 'pending' by default.")
    guest_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Name of the guest reviewer, if not logged in.")

# --- Screenshot Schemas ---
class ReviewScreenshotRead(BaseModel):
    id: int
    file_url: HttpUrl
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Usefulness Vote Schema ---
class ReviewUsefulnessVoteCreate(BaseModel):
    is_useful: bool

# --- Review Schemas ---
class ReviewBase(BaseModel):
    comment: Optional[str] = Field(None, min_length=3, max_length=5000)
    rating: int = Field(..., ge=1, le=5) # Add single rating here

class ReviewCreate(ReviewBase):
    item_id: int # Renamed from exchange_id
    # screenshot_urls: Optional[List[HttpUrl]] = None # Handle screenshot uploads separately

class ReviewRead(ReviewBase):
    id: int
    created_at: datetime
    moderation_status: ModerationStatusEnum
    useful_votes_count: int
    not_useful_votes_count: int
    item_id: int # Add item_id for context
    guest_name: Optional[str] = None # Add guest_name

    # Nested data
    user: Optional[UserRead] = None # Show public user info, now optional
    item: Optional[ItemReadBrief] = None # Show brief item info (polymorphic)
    screenshots: List[ReviewScreenshotRead] = []
    # tags: List[TagRead] = [] # Add tag schema if implemented

    class Config:
        from_attributes = True
