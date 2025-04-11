# app/news/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

from app.exchanges.schemas import ExchangeReadBrief # Optional: Link news to exchanges

class NewsItemBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=512)
    content: Optional[str] = None
    source_name: Optional[str] = Field(None, max_length=255)
    source_url: Optional[HttpUrl] = None
    published_at: datetime

class NewsItemCreate(NewsItemBase):
    exchange_ids: Optional[List[int]] = None # Link to exchanges on creation

class NewsItemUpdate(NewsItemBase):
    title: Optional[str] = Field(None, min_length=5, max_length=512)
    published_at: Optional[datetime] = None
    exchange_ids: Optional[List[int]] = None

class NewsItemRead(NewsItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Optional: Include brief exchange info if linked
    exchanges: List[ExchangeReadBrief] = []

    class Config:
        from_attributes = True