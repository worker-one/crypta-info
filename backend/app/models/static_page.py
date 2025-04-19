from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base # Import the Base from the central location

class StaticPage(Base):
    """
    Represents static content pages like 'About', 'FAQ', 'Terms', etc.
    """
    __tablename__ = 'static_pages'

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    last_updated_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # --- Relationships ---
    # Relationship to the User who last updated the page
    last_updated_by = relationship("User", back_populates="updated_static_pages")

    def __repr__(self):
        return f"<StaticPage(id={self.id}, slug='{self.slug}', title='{self.title}')>"