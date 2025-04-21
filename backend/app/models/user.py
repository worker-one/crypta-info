# app/models/user.py
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base # Import Base from the central location

class User(Base):
    """
    SQLAlchemy model for users.
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True, index=True) # Index email for faster lookups
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100), nullable=False, unique=True, index=True) # Index nickname too
    avatar_url = Column(String(512), nullable=True)
    email_verified_at = Column(DateTime, nullable=True) # Timestamp when email was verified
    is_admin = Column(Boolean, nullable=False, default=False)
    # is_active = Column(Boolean, nullable=False, default=True) # Optional: If user blocking is needed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # --- Relationships ---
    # Reviews created by this user
    reviews = relationship(
        "Review",
        back_populates="user",
        foreign_keys="Review.user_id", # Explicitly define FK to avoid ambiguity
        cascade="all, delete-orphan", # Delete user's reviews if user is deleted
        lazy="selectin" # Consider loading strategy based on usage
    )
    guides = relationship(
        "GuideItem",
        back_populates="creator",
        foreign_keys="GuideItem.created_by_user_id", # Explicitly define FK
        cascade="all, delete-orphan", # Delete user's guides if user is deleted
        lazy="selectin" # Consider loading strategy based on usage
    )
    usefulness_votes = relationship(
        "ReviewUsefulnessVote",
        back_populates="user",
        cascade="all, delete-orphan" # Delete user's votes if user is deleted
    )

    # Reviews moderated by this user (if they are an admin/moderator)
    moderated_reviews = relationship(
        "Review",
        back_populates="moderator",
        foreign_keys="Review.moderated_by_user_id", # Explicitly define FK for this relationship
        lazy="selectin"
    )

    # News items created by this user (if they are an admin/editor)
    created_news_items = relationship(
        "NewsItem",
        back_populates="creator",
        foreign_keys="NewsItem.created_by_user_id", # Explicitly define FK
        lazy="selectin"
    )

    # Static pages last updated by this user (if they are an admin/editor)
    updated_static_pages = relationship(
        "StaticPage",
        back_populates="last_updated_by",
        foreign_keys="StaticPage.last_updated_by_user_id", # Explicitly define FK
        lazy="selectin"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', nickname='{self.nickname}')>"