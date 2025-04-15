# app/reviews/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime
from app.models.review import ModerationStatusEnum
from app.auth.schemas import UserRead # Use UserRead to show author info
from app.exchanges.schemas import ExchangeReadBrief # Use brief exchange info
from app.schemas.common import RatingCategoryRead

# --- Rating Category Schemas ---
class RatingCategoryCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class RatingCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

# --- Rating Schemas ---
class ReviewRatingBase(BaseModel):
    category_id: int
    rating_value: int = Field(..., ge=1, le=5)

class ReviewRatingCreate(ReviewRatingBase):
    pass

class ReviewRatingRead(ReviewRatingBase):
    id: int
    category: RatingCategoryRead # Nested category info

    class Config:
        from_attributes = True

class ExchangeReviewCreate(BaseModel):
    exchange_id: int
    ratings: List[ReviewRatingCreate] = Field(..., min_length=1) # Require at least one category rating
    comment: str = Field(..., min_length=5, max_length=5000)

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
    comment: str = Field(..., min_length=5, max_length=5000)

class ReviewCreate(ReviewBase):
    exchange_id: int # Link to exchange
    ratings: List[ReviewRatingCreate] = Field(..., min_length=1) # Require at least one category rating
    # screenshot_urls: Optional[List[HttpUrl]] = None # Handle screenshot uploads separately

class ReviewRead(ReviewBase):
    id: int
    created_at: datetime
    moderation_status: ModerationStatusEnum
    useful_votes_count: int
    not_useful_votes_count: int

    # Nested data
    user: UserRead # Show public user info
    exchange: ExchangeReadBrief # Show brief exchange info
    ratings: List[ReviewRatingRead] = []
    screenshots: List[ReviewScreenshotRead] = []
    # tags: List[TagRead] = [] # Add tag schema if implemented

    class Config:
        from_attributes = True

# Schema for Admin/Moderation update payload
class ReviewAdminUpdatePayload(BaseModel):
    moderation_status: Optional[ModerationStatusEnum] = None
    moderator_notes: Optional[str] = Field(None, max_length=1000) # Optional notes field


# --- Filtering and Sorting ---
class ReviewFilterParams(BaseModel):
    exchange_id: Optional[int] = None
    user_id: Optional[int] = None
    min_overall_rating: Optional[float] = Field(None, ge=1.0, le=5.0) # Requires calculating overall rating
    max_overall_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    has_screenshot: Optional[bool] = None
    # Make status optional, default to None (meaning no filter unless specified)
    moderation_status: Optional[ModerationStatusEnum] = None
    # tag_id: Optional[int] = None

class ReviewSortBy(BaseModel):
    field: Literal["created_at", "usefulness"] = "created_at" # Add 'rating' if needed
    direction: Literal["asc", "desc"] = "desc"