# app/news/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

from app.exchanges.schemas import ExchangeReadBrief # Optional: Link guides to exchanges

class GuideItemBase(BaseModel): # Renamed class
    title: str = Field(..., min_length=5, max_length=512)
    content: Optional[str] = None
    source_name: Optional[str] = Field(None, max_length=255)
    source_url: Optional[HttpUrl] = None
    published_at: datetime

class GuideItemCreate(GuideItemBase): # Renamed class
    exchange_ids: Optional[List[int]] = None # Link to exchanges on creation

class GuideItemUpdate(GuideItemBase): # Renamed class
    title: Optional[str] = Field(None, min_length=5, max_length=512)
    published_at: Optional[datetime] = None
    exchange_ids: Optional[List[int]] = None

class GuideItemRead(GuideItemBase): # Renamed class
    id: int
    created_at: datetime
    updated_at: datetime
    # Optional: Include brief exchange info if linked
    exchanges: List[ExchangeReadBrief] = []

    class Config:
        from_attributes = True