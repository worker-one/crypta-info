# app/static_pages/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class StaticPageBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=10)
    slug: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")

class StaticPageCreate(StaticPageBase):
    pass

class StaticPageUpdate(StaticPageBase):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    content: Optional[str] = Field(None, min_length=10)
    slug: Optional[str] = Field(None, min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")

class StaticPageRead(StaticPageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Optional: Add info about who last updated it if needed
    # last_updated_by: Optional[UserRead] = None

    class Config:
        from_attributes = True