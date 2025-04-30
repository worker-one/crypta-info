# app/models/item.py
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Numeric, Enum as SQLAlchemyEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# Import Base from the central location
from .base import Base

# Enum for Item types (used for polymorphism)
class ItemTypeEnum(str, enum.Enum):
    exchange = 'exchange'
    book = 'book'
    # Add other item types here in the future

class Item(Base):
    """
    Generic base model for rankable items (Exchanges, Books, etc.).
    Uses joined table inheritance.
    """
    __tablename__ = 'items'

    id = Column(Integer, primary_key=True)
    item_type = Column(SQLAlchemyEnum(ItemTypeEnum, name='item_type_enum'), nullable=False, index=True) # Discriminator column

    # Common fields moved from Exchange / defined for Book
    name = Column(String(255), nullable=False, index=True) # Generic name/title
    slug = Column(String(255), nullable=False, unique=True)
    overview = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(512), nullable=True) # Generic logo/cover placeholder
    website_url = Column(String(512), nullable=True)

    # Common aggregated fields
    overall_average_rating = Column(Numeric(3, 2), default=0.00, index=True)
    total_review_count = Column(Integer, default=0, index=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- Relationships ---
    # Reviews now relate to the generic Item
    # Note: 'Review' needs to be imported if not using string reference,
    # but string reference is generally safer for cross-file relationships.
    reviews = relationship(
        "Review",
        back_populates="item",
        # Consider cascade options carefully. Deleting an item might delete its reviews.
        cascade="all, delete-orphan"
    )

    # --- Polymorphism Setup ---
    __mapper_args__ = {
        'polymorphic_identity': 'item', # Base identity (optional but good practice)
        'polymorphic_on': item_type     # Column used to determine the subclass
    }

    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id}, name='{self.name}', type='{self.item_type}')>"