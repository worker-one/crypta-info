# app/models/news.py

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
# Import the association table if it's defined elsewhere, e.g., in exchange.py
# This assumes it's importable via app.models
# If not, define the Table object here or adjust the import path.
from app.models.exchange import news_item_exchanges_table

class NewsItem(Base):
    """
    Represents a news item or event related to cryptocurrency exchanges.
    """
    __tablename__ = 'news_items'

    id = Column(Integer, primary_key=True)
    title = Column(String(512), nullable=False)
    content = Column(Text, nullable=True) # Content might be optional if it's just a headline/link
    source_name = Column(String(255), nullable=True)
    source_url = Column(String(512), nullable=True) # Consider using URL type if your db supports it
    published_at = Column(DateTime, nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True) # Keep news if admin creator deleted
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # --- Relationships ---

    # Many-to-One relationship with User (the creator/author)
    creator = relationship("User", back_populates="created_news_items")

    # Many-to-Many relationship with Exchange (news item can relate to multiple exchanges)
    exchanges = relationship(
        "Exchange",
        secondary=news_item_exchanges_table,
        back_populates="news_items"
    )

    def __repr__(self):
        return f"<NewsItem(id={self.id}, title='{self.title[:30]}...')>"