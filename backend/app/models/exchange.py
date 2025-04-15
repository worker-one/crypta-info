# app/models/exchange.py
import enum

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Numeric,
    ForeignKey, Enum as SQLAlchemyEnum, SmallInteger, Date, Table,
    UniqueConstraint, Index, PrimaryKeyConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base # Import Base from models.base

# --- Enums (used in models) ---
# Define Enums here if they are primarily used by Exchange models
# or define them in a central place like models/common.py and import
class KYCTypeEnum(enum.Enum):
    mandatory = 'mandatory'
    optional = 'optional'
    none = 'none'

# --- Association Tables (Many-to-Many) ---
# Define M2M tables related to Exchange here

exchange_languages_table = Table('exchange_languages', Base.metadata,
    Column('exchange_id', Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), primary_key=True),
    # Use string reference for ForeignKey target if model defined elsewhere
    Column('language_id', Integer, ForeignKey('languages.id', ondelete='CASCADE'), primary_key=True)
)

exchange_availability_table = Table('exchange_availability', Base.metadata,
    Column('exchange_id', Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), primary_key=True),
    # Use string reference for ForeignKey target if model defined elsewhere
    Column('country_id', Integer, ForeignKey('countries.id', ondelete='CASCADE'), primary_key=True)
)

exchange_fiat_support_table = Table('exchange_fiat_support', Base.metadata,
    Column('exchange_id', Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), primary_key=True),
    # Use string reference for ForeignKey target if model defined elsewhere
    Column('fiat_currency_id', Integer, ForeignKey('fiat_currencies.id', ondelete='CASCADE'), primary_key=True)
)

# If NewsItem is in another file, define the M2M table here or in news.py
news_item_exchanges_table = Table('news_item_exchanges', Base.metadata,
    Column('news_item_id', Integer, ForeignKey('news_items.id', ondelete='CASCADE'), primary_key=True),
    Column('exchange_id', Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), primary_key=True)
)

# --- Model Classes ---

class Exchange(Base):
    __tablename__ = 'exchanges'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    slug = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True) # <-- Add this line
    logo_url = Column(String(512))
    website_url = Column(String(512))
    year_founded = Column(SmallInteger)
    # Use string reference for ForeignKey target if model defined elsewhere
    registration_country_id = Column(Integer, ForeignKey('countries.id', ondelete='SET NULL'))
    headquarters_country_id = Column(Integer, ForeignKey('countries.id', ondelete='SET NULL'), nullable=True)
    kyc_type = Column(SQLAlchemyEnum(KYCTypeEnum, name='kyc_type_enum'), nullable=False, default=KYCTypeEnum.mandatory)
    has_p2p = Column(Boolean, nullable=False, default=False)
    trading_volume_24h = Column(Numeric(20, 2), index=True)
    maker_fee_min = Column(Numeric(8, 5))
    maker_fee_max = Column(Numeric(8, 5))
    taker_fee_min = Column(Numeric(8, 5))
    taker_fee_max = Column(Numeric(8, 5))
    fee_structure_summary = Column(Text)
    security_details = Column(Text)
    kyc_aml_policy = Column(Text)

    # Aggregated fields (updated periodically)
    overall_average_rating = Column(Numeric(3, 2), default=0.00, index=True)
    total_review_count = Column(Integer, default=0)
    liquidity_score = Column(Numeric(5, 2), default=0.00)
    newbie_friendliness_score = Column(Numeric(3, 2), default=0.00)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    # Use string reference for related model class if defined in another file
    registration_country = relationship("Country", back_populates="registered_exchanges", foreign_keys=[registration_country_id])
    headquarters_country = relationship("Country", back_populates="headquartered_exchanges", foreign_keys=[headquarters_country_id])
    available_in_countries = relationship("Country", secondary=exchange_availability_table, back_populates="available_exchanges")
    languages = relationship("Language", secondary=exchange_languages_table, back_populates="exchanges")
    supported_fiat_currencies = relationship("FiatCurrency", secondary=exchange_fiat_support_table, back_populates="exchanges")
    licenses = relationship("License", back_populates="exchange", cascade="all, delete-orphan")
    social_links = relationship("ExchangeSocialLink", back_populates="exchange", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="exchange") # Don't cascade delete reviews usually
    news_items = relationship("NewsItem", secondary=news_item_exchanges_table, back_populates="exchanges")
    category_ratings = relationship("ExchangeCategoryRating", back_populates="exchange", cascade="all, delete-orphan")

class License(Base):
    __tablename__ = 'licenses'
    id = Column(Integer, primary_key=True)
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), nullable=False)
    # Use string reference for ForeignKey target if model defined elsewhere
    jurisdiction_country_id = Column(Integer, ForeignKey('countries.id', ondelete='RESTRICT'), nullable=False) # Prevent deleting country if license exists
    license_number = Column(String(255))
    status = Column(String(50))
    issue_date = Column(Date)
    expiry_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    exchange = relationship("Exchange", back_populates="licenses")
    # Use string reference for related model class if defined in another file
    jurisdiction_country = relationship("Country", back_populates="licenses_issued")

    __table_args__ = (Index('idx_licenses_exchange', 'exchange_id'), )

class ExchangeSocialLink(Base):
    __tablename__ = 'exchange_social_links'
    id = Column(Integer, primary_key=True)
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), nullable=False)
    platform_name = Column(String(50), nullable=False) # e.g., 'Twitter', 'Telegram'
    url = Column(String(512), nullable=False)

    # Relationships
    exchange = relationship("Exchange", back_populates="social_links")

    __table_args__ = (UniqueConstraint('exchange_id', 'platform_name', name='uk_exchange_platform'),)

class ExchangeCategoryRating(Base):
    __tablename__ = 'exchange_category_ratings'
    # Composite Primary Key defined in __table_args__
    exchange_id = Column(Integer, ForeignKey('exchanges.id', ondelete='CASCADE'), nullable=False)
    # Use string reference for ForeignKey target if model defined elsewhere
    category_id = Column(Integer, ForeignKey('rating_categories.id', ondelete='CASCADE'), nullable=False)
    average_rating = Column(Numeric(3, 2), nullable=False, default=0.00)
    review_count = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime)

    # Relationships
    exchange = relationship("Exchange", back_populates="category_ratings")
    # Use string reference for related model class if defined in another file
    category = relationship("RatingCategory", back_populates="exchange_category_ratings")

    __table_args__ = (
        PrimaryKeyConstraint('exchange_id', 'category_id', name='pk_exchange_category_ratings'),
    )