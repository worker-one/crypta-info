# app/models/review.py
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, SmallInteger,
    ForeignKey, Enum as SQLAlchemyEnum, Table, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base # Import Base from models.base

# --- Enums ---
# Define Enums here if they are primarily used by Review models
# or define them in a central place like models/common.py and import
class ModerationStatusEnum(enum.Enum):
    pending = 'pending'
    approved = 'approved'
    rejected = 'rejected'


# --- Association Tables ---
# Define M2M tables related to Review here
review_tag_assignments_table = Table('review_tag_assignments', Base.metadata,
    Column('review_id', Integer, ForeignKey('reviews.id', ondelete='CASCADE'), primary_key=True),
    # Use string reference for ForeignKey target if model defined elsewhere
    Column('tag_id', Integer, ForeignKey('review_tags.id', ondelete='CASCADE'), primary_key=True)
)


# --- Model Classes ---

class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True)
    # Use string reference for ForeignKey target if model defined elsewhere
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False) # Cascade delete review if user is deleted
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), nullable=False) # Cascade delete review if exchange is deleted
    comment = Column(Text, nullable=False)
    moderation_status = Column(SQLAlchemyEnum(ModerationStatusEnum, name='moderation_status_enum'), nullable=False, default=ModerationStatusEnum.pending, index=True)
    moderator_notes = Column(Text)
    # Use string reference for ForeignKey target if model defined elsewhere
    moderated_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True) # Keep review if moderator deleted
    moderated_at = Column(DateTime, nullable=True)
    useful_votes_count = Column(Integer, nullable=False, default=0)
    not_useful_votes_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    # Use string reference for related model class if defined in another file
    user = relationship("User", back_populates="reviews", foreign_keys=[user_id])
    exchange = relationship("Exchange", back_populates="reviews")
    moderator = relationship("User", back_populates="moderated_reviews", foreign_keys=[moderated_by_user_id])
    ratings = relationship("ReviewRating", back_populates="review", cascade="all, delete-orphan")
    screenshots = relationship("ReviewScreenshot", back_populates="review", cascade="all, delete-orphan")
    usefulness_votes = relationship("ReviewUsefulnessVote", back_populates="review", cascade="all, delete-orphan")
    tags = relationship("ReviewTag", secondary=review_tag_assignments_table, back_populates="reviews")

    __table_args__ = (
        Index('idx_reviews_exchange_status_date', 'exchange_id', 'moderation_status', 'created_at'),
        Index('idx_reviews_user', 'user_id'),
    )

class ReviewRating(Base):
    __tablename__ = 'review_ratings'
    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False)
    # Use string reference for ForeignKey target if model defined elsewhere
    category_id = Column(Integer, ForeignKey('rating_categories.id', ondelete='CASCADE'), nullable=False) # Or RESTRICT if category deleted
    rating_value = Column(SmallInteger, nullable=False) # 1 to 5

    # Relationships
    review = relationship("Review", back_populates="ratings")
    # Use string reference for related model class if defined in another file
    category = relationship("RatingCategory", back_populates="review_ratings")

    __table_args__ = (
        UniqueConstraint('review_id', 'category_id', name='uk_review_category'),
        CheckConstraint('rating_value >= 1 AND rating_value <= 5', name='ck_rating_value')
    )

class ReviewScreenshot(Base):
    __tablename__ = 'review_screenshots'
    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer)
    mime_type = Column(String(50))
    uploaded_at = Column(DateTime, server_default=func.now())

    # Relationships
    review = relationship("Review", back_populates="screenshots")

class ReviewUsefulnessVote(Base):
    __tablename__ = 'review_usefulness_votes'
    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False)
    # Use string reference for ForeignKey target if model defined elsewhere
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False) # Vote deleted if user deleted
    is_useful = Column(Boolean, nullable=False) # TRUE for useful, FALSE for not useful
    voted_at = Column(DateTime, server_default=func.now())

    # Relationships
    review = relationship("Review", back_populates="usefulness_votes")
    # Use string reference for related model class if defined in another file
    user = relationship("User", back_populates="usefulness_votes")

    __table_args__ = (UniqueConstraint('review_id', 'user_id', name='uk_review_user_vote'),)