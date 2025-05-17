# app/books/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal

# --- Topic Schema ---
class TopicRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# --- Book Schemas ---
class BookBase(BaseModel):
    # Inherited fields from Item (represented here for clarity)
    name: str = Field(..., min_length=2, max_length=255, description="Title of the book")
    slug: str = Field(..., min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$", description="URL-friendly slug")
    overview: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[HttpUrl] = Field(None, description="Cover image URL")
    website_url: Optional[HttpUrl] = Field(None, description="Link to buy or learn more")
    referral_link: Optional[HttpUrl] = Field(None, description="Affiliate link for the book")

    
    # Book-specific fields
    # topic: Optional[str] = Field(None, max_length=255, index=True) # Replaced by M2M topics
    year: Optional[int] = Field(None, ge=1500, le=datetime.now().year)
    number: Optional[str] = Field(None, max_length=50, index=True, description="ISBN, ASIN, etc.")
    pages: Optional[int] = Field(None, ge=1, description="Number of pages")
    author: Optional[str] = Field(None, max_length=255, description="Author(s) of the book")
    publisher: Optional[str] = Field(None, max_length=255, description="Publisher of the book")

class BookCreate(BookBase):
    # IDs for M2M relationships
    topic_ids: List[int] = []
    pass

class BookUpdate(BookBase):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$")
    logo_url: Optional[HttpUrl] = None
    website_url: Optional[HttpUrl] = None
    referral_link: Optional[HttpUrl] = None
    year: Optional[int] = Field(None, ge=1500, le=datetime.now().year)
    number: Optional[str] = Field(None, max_length=50)

    # Allow updating M2M relationships
    topic_ids: Optional[List[int]] = None
    pass

# Schema for brief list view (inherits from ItemReadBrief essentially)
class BookReadBrief(BaseModel):
    id: int
    name: str # Title
    slug: str
    logo_url: Optional[HttpUrl] = None # Cover URL
    overall_average_rating: Decimal = Field(max_digits=3, decimal_places=2)
    total_review_count: int
    year: Optional[int] = None
    author: Optional[str] = None

    class Config:
        from_attributes = True

# Schema for detailed view
class BookRead(BookBase):
    id: int
    # Inherited Item fields
    overall_average_rating: Decimal = Field(max_digits=3, decimal_places=2)
    total_review_count: int
    author: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Nested related data
    topics: List[TopicRead] = []
    # reviews: List[ReviewRead] = [] # Assuming ReviewRead exists elsewhere

    class Config:
        from_attributes = True

# --- Filtering and Sorting ---
class BookFilterParams(BaseModel):
    name: Optional[str] = None # Filter by title
    topic_id: Optional[int] = None # Filter by a specific topic ID
    min_year: Optional[int] = None
    max_year: Optional[int] = None
    min_total_review_count: Optional[int] = None
    max_total_review_count: Optional[int] = None

class BookSortBy(BaseModel):
    field: Literal['name', 'year', 'overall_average_rating', 'total_review_count', "author"] = 'overall_average_rating'
    direction: Literal['asc', 'desc'] = 'desc'
