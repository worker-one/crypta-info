# app/models/review.py
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, SmallInteger,
    ForeignKey, Enum as SQLAlchemyEnum, Table, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Import Base (and potentially Item if needed for type hints, though string ref is used)
from .base import Base
# from .item import Item # Optional: for type hints if not using string reference

# --- Enums ---
class ModerationStatusEnum(enum.Enum):
    pending = 'pending'
    approved = 'approved'
    rejected = 'rejected'


# --- Model Classes ---

class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True)

    # Foreign key to User, now nullable
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # New field for guest name
    guest_name = Column(String(100), nullable=True)

    # *** CHANGE: Link to the generic 'items' table instead of 'exchanges' ***
    item_id = Column(Integer, ForeignKey('items.id', ondelete='CASCADE'), nullable=False, index=True)

    comment = Column(Text, nullable=False)
    rating = Column(SmallInteger, nullable=False)  # 1 to 5 rating
    moderation_status = Column(SQLAlchemyEnum(ModerationStatusEnum, name='moderation_status_enum'), nullable=False, default=ModerationStatusEnum.pending, index=True)
    moderator_notes = Column(Text)
    moderated_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    moderated_at = Column(DateTime, nullable=True)
    useful_votes_count = Column(Integer, nullable=False, default=0)
    not_useful_votes_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- Relationships ---
    user = relationship("User", back_populates="reviews", foreign_keys=[user_id])

    # *** CHANGE: Relationship points to generic 'Item' ***
    item = relationship("Item", back_populates="reviews")

    # Other relationships remain the same
    moderator = relationship("User", back_populates="moderated_reviews", foreign_keys=[moderated_by_user_id])
    screenshots = relationship("ReviewScreenshot", back_populates="review", cascade="all, delete-orphan")
    usefulness_votes = relationship("ReviewUsefulnessVote", back_populates="review", cascade="all, delete-orphan")

    __table_args__ = (
        # *** CHANGE: Update index to use item_id ***
        Index('idx_reviews_item_status_date', 'item_id', 'moderation_status', 'created_at'),
        # Index('idx_reviews_user', 'user_id'), # Already indexed via ForeignKey/user_id column def
        CheckConstraint("NOT (user_id IS NOT NULL AND guest_name IS NOT NULL)", name="cc_review_author_exclusive"),
        CheckConstraint("user_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_name != '')", name="cc_review_author_required"),
    )

# --- Other Review-related models (ReviewRating, ReviewScreenshot, ReviewUsefulnessVote) ---
# These models link to Review.id, so they do NOT need changes themselves.

class ReviewScreenshot(Base):
    __tablename__ = 'review_screenshots'
    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer)
    mime_type = Column(String(50))
    uploaded_at = Column(DateTime, server_default=func.now())

    review = relationship("Review", back_populates="screenshots")

class ReviewUsefulnessVote(Base):
    __tablename__ = 'review_usefulness_votes'
    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_useful = Column(Boolean, nullable=False)
    voted_at = Column(DateTime, server_default=func.now())

    review = relationship("Review", back_populates="usefulness_votes")
    user = relationship("User", back_populates="usefulness_votes")

    __table_args__ = (UniqueConstraint('review_id', 'user_id', name='uk_review_user_vote'),)