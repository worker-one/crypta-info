# app/models/book.py
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Numeric,
    ForeignKey, SmallInteger, Date, Table # Import necessary types, including Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Import Base and Item
from .base import Base
from .item import Item, ItemTypeEnum # Import Item and the Enum

# --- Association Table for Book <-> Topic ---
book_topics_table = Table('book_topics', Base.metadata,
    Column('book_id', Integer, ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    Column('topic_id', Integer, ForeignKey('topics.id', ondelete='CASCADE'), primary_key=True)
)

# --- Model Class ---

# Inherit from Item
class Book(Item):
    __tablename__ = 'books'

    # Primary Key is now also a Foreign Key to the items table
    id = Column(Integer, ForeignKey('items.id', ondelete='CASCADE'), primary_key=True)

    # --- Common fields are inherited from Item ---
    # Inherited: name (will act as title), slug, overview, description, logo_url, website_url
    # Inherited: rating, total_review_count
    # Inherited: created_at, updated_at

    # --- Book-specific fields ---
    # Note: 'name' from Item serves as the 'title'.
    # Note: 'logo_url' from Item serves as the 'cover_url'.

    # topic = Column(String(255), index=True) # Remove this if using M2M topics
    year = Column(SmallInteger)             # Publication year
    author = Column(String(255), nullable=True) # Author(s) of the book
    publisher = Column(String(255), nullable=True) # Publisher of the book
    pages = Column(Integer, nullable=True)    # Number of pages
    number = Column(String(50), index=True) # e.g., ISBN, ASIN, or other identifier

    # --- Relationships ---
    # The 'reviews' relationship is inherited from Item.
    # M2M relationship with Topic
    topics = relationship(
        "Topic",
        secondary=book_topics_table,
        back_populates="books" # Link back to Topic.books
    )

    # --- Polymorphism Setup ---
    __mapper_args__ = {
        'polymorphic_identity': ItemTypeEnum.book, # Specific identity for this subclass
    }

    # Optional: Define __repr__ if you want specific Book details
    # def __repr__(self):
    #    return f"<Book(id={self.id}, title='{self.name}', year={self.year})>" # name is inherited

# --- New Topic Model ---
class Topic(Base):
    """
    Represents a topic or category for items like Books.
    """
    __tablename__ = 'topics'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True) # URL-friendly version
    description = Column(Text, nullable=True)

    # --- Relationships ---
    # M2M relationship back-reference defined in Book model
    books = relationship(
        "Book",
        secondary=book_topics_table, # Use the defined association table
        back_populates="topics" # Link back to Book.topics
    )

    def __repr__(self):
        return f"<Topic(id={self.id}, name='{self.name}')>"