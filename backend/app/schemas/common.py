# app/schemas/common.py
from pydantic import BaseModel, Field
from typing import List, TypeVar, Generic, Optional

T = TypeVar('T')

class ItemReadBrief(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True # For SQLAlchemy ORM mode compatibility (previously orm_mode)

class Message(BaseModel):
    message: str

class PaginationParams(BaseModel):
    skip: int = Field(0, ge=0, description="Number of items to skip")
    limit: int = Field(10, ge=1, le=100, description="Number of items per page")

class PaginatedResponse(BaseModel, Generic[T]):
    total: int = Field(..., description="Total number of items")
    items: List[T] = Field(..., description="List of items on the current page")
    skip: int
    limit: int

# Basic schemas for common models (can be expanded)
class CountryRead(BaseModel):
    id: int
    name: str
    code_iso_alpha2: str

    class Config:
        from_attributes = True # For SQLAlchemy ORM mode compatibility (previously orm_mode)

class LanguageRead(BaseModel):
    id: int
    name: str
    code_iso_639_1: str

    class Config:
        from_attributes = True

class FiatCurrencyRead(BaseModel):
    id: int
    name: str
    code_iso_4217: str

    class Config:
        from_attributes = True

class RatingCategoryRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True