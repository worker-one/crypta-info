# app/models/guide.py

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base

class GuideItem(Base):
    """
    Represents a guide item.
    """
    __tablename__ = 'guide_items'

    id = Column(Integer, primary_key=True)
    title = Column(String(512), nullable=False)
    content = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='SET NULL'), nullable=True)  # Optional foreign key to Exchange
    created_at = Column(DateTime, server_default=func.now())
    published_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- Relationships ---

    # Many-to-One relationship with User (the creator/author)
    creator = relationship("User", back_populates="guides")
    exchange = relationship("Exchange", back_populates="guide_items")

    def __repr__(self):
        return f"<GuideItem(id={self.id}, title='{self.title[:30]}...')>"
