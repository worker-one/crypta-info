# app/exchanges/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import date, datetime
from decimal import Decimal
import enum  # Required for KycTypeEnum

from app.schemas.common import CountryRead, LanguageRead, FiatCurrencyRead

# Define KycTypeEnum for Pydantic, matching the model's enum
class KycTypeEnum(str, enum.Enum):
    NONE = "none"
    BASIC = "basic"
    ADVANCED = "advanced"
    VERIFIED_PLUS = "verified_plus"

# --- License Schemas ---
class LicenseRead(BaseModel):
    id: int
    jurisdiction_country: CountryRead
    license_number: Optional[str] = None
    status: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

    class Config:
        from_attributes = True

# --- Social Link Schemas ---
class ExchangeSocialLinkRead(BaseModel):
    id: int
    platform_name: str
    url: HttpUrl

    class Config:
        from_attributes = True


# --- Exchange Schemas ---
class ExchangeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255)  # Basic slug pattern
    description: Optional[str] = None
    overview: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    referral_link: Optional[str] = None
    year_founded: Optional[int] = Field(None, ge=1990, le=datetime.now().year)
    reviews_page_content: Optional[str] = None  # Placeholder for reviews page content

    has_kyc: Optional[bool] = None
    has_p2p: Optional[bool] = None
    has_copy_trading: Optional[bool] = None
    has_staking: Optional[bool] = None
    has_futures: Optional[bool] = None
    has_spot_trading: Optional[bool] = None
    has_demo_trading: Optional[bool] = None

    trading_volume_24h: Optional[Decimal] = Field(None, ge=0, max_digits=20, decimal_places=2)

    spot_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    spot_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)

    fee_structure_summary: Optional[str] = None
    security_details: Optional[str] = None
    kyc_aml_policy: Optional[str] = None

    liquidity_score: Optional[Decimal] = Field(None, ge=0, max_digits=5, decimal_places=2)
    newbie_friendliness_score: Optional[Decimal] = Field(None, ge=0, max_digits=3, decimal_places=2)

    # Foreign Key IDs for creation/update - validation might be needed in service
    registration_country_id: Optional[int] = None
    headquarters_country_id: Optional[int] = None

class ExchangeCreate(ExchangeBase):
    # Add lists of IDs for many-to-many relationships during creation if needed
    available_in_country_ids: List[int] = []
    language_ids: List[int] = []
    supported_fiat_currency_ids: List[int] = []
    pass

class ExchangeUpdate(ExchangeBase):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    overview: Optional[str] = None
    has_kyc: Optional[bool] = None
    has_p2p: Optional[bool] = None
    has_copy_trading: Optional[bool] = None
    has_staking: Optional[bool] = None
    has_futures: Optional[bool] = None
    has_spot_trading: Optional[bool] = None
    has_demo_trading: Optional[bool] = None
    spot_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    spot_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    # Allow updating related IDs - service needs to handle this
    available_in_country_ids: Optional[List[int]] = None
    language_ids: Optional[List[int]] = None
    supported_fiat_currency_ids: Optional[List[int]] = None
    pass

# Schema for brief list view
class ExchangeReadBrief(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[HttpUrl] = None
    overall_average_rating: Decimal = Field(max_digits=3, decimal_places=2)
    total_review_count: int  # Number of reviews with comments
    total_rating_count: int  # Number of reviews with ratings
    trading_volume_24h: Optional[Decimal] = Field(None, ge=0, max_digits=20, decimal_places=2)
    year_founded: Optional[int] = None
    registration_country: Optional[CountryRead] = None  # Only basic info

    has_kyc: Optional[bool] = None
    has_p2p: Optional[bool] = None
    has_copy_trading: Optional[bool] = None
    has_staking: Optional[bool] = None
    has_futures: Optional[bool] = None
    has_spot_trading: Optional[bool] = None
    has_demo_trading: Optional[bool] = None

    spot_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    spot_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    futures_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)

    class Config:
        from_attributes = True

# Schema for detailed view
class ExchangeRead(ExchangeBase):
    id: int
    overall_average_rating: Decimal = Field(max_digits=3, decimal_places=2)
    total_review_count: int  # Number of reviews with comments
    total_rating_count: int  # Number of reviews with ratings
    created_at: datetime
    updated_at: datetime

    # Nested related data
    registration_country: Optional[CountryRead] = None
    headquarters_country: Optional[CountryRead] = None
    available_in_countries: List[CountryRead] = []
    languages: List[LanguageRead] = []
    supported_fiat_currencies: List[FiatCurrencyRead] = []
    licenses: List[LicenseRead] = []
    social_links: List[ExchangeSocialLinkRead] = []

    has_kyc: Optional[bool] = None
    has_p2p: Optional[bool] = None
    has_copy_trading: Optional[bool] = None
    has_staking: Optional[bool] = None
    has_futures: Optional[bool] = None
    has_spot_trading: Optional[bool] = None
    has_demo_trading: Optional[bool] = None

    class Config:
        from_attributes = True

# --- Filtering and Sorting ---
class ExchangeFilterParams(BaseModel):
    name: Optional[str] = None
    country_id: Optional[int] = None  # Filter by registration or availability
    has_license_in_country_id: Optional[int] = None
    has_kyc: Optional[bool] = None
    min_spot_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    max_spot_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    min_futures_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    max_futures_maker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    min_spot_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    max_spot_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    min_futures_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    max_futures_taker_fee: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    supports_fiat_id: Optional[int] = None
    supports_language_id: Optional[int] = None
    min_total_review_count: Optional[int] = None
    max_total_review_count: Optional[int] = None
    min_total_rating_count: Optional[int] = None
    max_total_rating_count: Optional[int] = None
    has_p2p: Optional[bool] = None
    has_copy_trading: Optional[bool] = None
    has_staking: Optional[bool] = None
    has_futures: Optional[bool] = None
    has_spot_trading: Optional[bool] = None
    has_demo_trading: Optional[bool] = None

class ExchangeSortBy(BaseModel):
    field: Literal['name', 'overall_average_rating', 'trading_volume_24h', 'total_review_count', 'total_rating_count', "has_kyc", "has_p2p"] = 'overall_average_rating'
    direction: Literal['asc', 'desc'] = 'desc'