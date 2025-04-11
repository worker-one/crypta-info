# app/models/common.py

from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey
from sqlalchemy.orm import relationship

# Import Base from the central location
from .base import Base

# Note: Association tables (like exchange_languages_table, etc.) are assumed to be defined
# in the model files where they are primarily used (e.g., exchange.py, review.py)
# and made available through the app.models namespace.

class Country(Base):
    """
    Represents a country, used for registration, headquarters, availability, and license jurisdiction.
    """
    __tablename__ = 'countries'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_alpha2 = Column(String(2), nullable=False, unique=True, index=True) # ISO 3166-1 alpha-2

    # Relationships defined in other models will point here using foreign keys.
    # Define the 'many' side of the relationships here for bidirectional linking.
    registered_exchanges = relationship(
        "Exchange",
        back_populates="registration_country",
        foreign_keys="Exchange.registration_country_id" # Specify FK explicitly
    )
    headquartered_exchanges = relationship(
        "Exchange",
        back_populates="headquarters_country",
        foreign_keys="Exchange.headquarters_country_id" # Specify FK explicitly
    )
    # M2M relationship back-reference defined in Exchange model
    available_exchanges = relationship(
        "Exchange",
        secondary='exchange_availability', # String name matches __tablename__ of association table
        back_populates="available_in_countries"
    )
    licenses_issued = relationship("License", back_populates="jurisdiction_country")

    def __repr__(self):
        return f"<Country(id={self.id}, name='{self.name}', code='{self.code_iso_alpha2}')>"

class Language(Base):
    """
    Represents an interface language supported by an exchange.
    """
    __tablename__ = 'languages'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_639_1 = Column(String(2), nullable=False, unique=True, index=True) # ISO 639-1 code

    # M2M relationship back-reference defined in Exchange model
    exchanges = relationship(
        "Exchange",
        secondary='exchange_languages', # String name matches __tablename__ of association table
        back_populates="languages"
    )

    def __repr__(self):
        return f"<Language(id={self.id}, name='{self.name}', code='{self.code_iso_639_1}')>"


class FiatCurrency(Base):
    """
    Represents a fiat currency supported by an exchange (e.g., USD, EUR).
    """
    __tablename__ = 'fiat_currencies'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_4217 = Column(String(3), nullable=False, unique=True, index=True) # ISO 4217 code

    # M2M relationship back-reference defined in Exchange model
    exchanges = relationship(
        "Exchange",
        secondary='exchange_fiat_support', # String name matches __tablename__ of association table
        back_populates="supported_fiat_currencies"
    )

    def __repr__(self):
        return f"<FiatCurrency(id={self.id}, name='{self.name}', code='{self.code_iso_4217}')>"


class RatingCategory(Base):
    """
    Represents a category for which users can rate an exchange (e.g., UI/UX, Support).
    """
    __tablename__ = 'rating_categories'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)

    # Relationships (One-to-Many)
    review_ratings = relationship("ReviewRating", back_populates="category")
    exchange_category_ratings = relationship("ExchangeCategoryRating", back_populates="category")

    def __repr__(self):
        return f"<RatingCategory(id={self.id}, name='{self.name}')>"


class ReviewTag(Base):
    """
    Represents tags that can be assigned to reviews (e.g., #verification_issue, #good_support).
    """
    __tablename__ = 'review_tags'

    id = Column(Integer, primary_key=True)
    tag_name = Column(String(50), nullable=False, unique=True, index=True)

    # M2M relationship back-reference defined in Review model
    reviews = relationship(
        "Review",
        secondary='review_tag_assignments', # String name matches __tablename__ of association table
        back_populates="tags"
    )

    def __repr__(self):
        return f"<ReviewTag(id={self.id}, tag_name='{self.tag_name}')>"