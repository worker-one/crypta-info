# app/exchanges/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import date, datetime
from decimal import Decimal

from app.schemas.common import CountryRead, LanguageRead, FiatCurrencyRead, RatingCategoryRead

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
    slug: str = Field(..., min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$") # Basic slug pattern
    description: Optional[str] = None
    overview: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    year_founded: Optional[int] = Field(None, ge=1990, le=datetime.now().year)
    has_kyc: bool = False
    has_p2p: bool = False
    trading_volume_24h: Optional[Decimal] = Field(None, ge=0, max_digits=20, decimal_places=2)
    maker_fee_min: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    maker_fee_max: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    taker_fee_min: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    taker_fee_max: Optional[Decimal] = Field(None, ge=0, max_digits=8, decimal_places=5)
    fee_structure_summary: Optional[str] = None
    security_details: Optional[str] = None
    kyc_aml_policy: Optional[str] = None

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
    total_review_count: int
    trading_volume_24h: Optional[Decimal] = Field(None, ge=0, max_digits=20, decimal_places=2)
    year_founded: Optional[int] = None
    registration_country: Optional[CountryRead] = None # Only basic info
    has_kyc: bool = False
    has_p2p: bool = False
    class Config:
        from_attributes = True

# Schema for detailed view
class ExchangeRead(ExchangeBase):
    id: int
    overall_average_rating: Decimal = Field(max_digits=3, decimal_places=2)
    total_review_count: int
    liquidity_score: Optional[Decimal] = Field(None, max_digits=5, decimal_places=2)
    newbie_friendliness_score: Optional[Decimal] = Field(None, max_digits=3, decimal_places=2)
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

    class Config:
        from_attributes = True

# --- Filtering and Sorting ---
class ExchangeFilterParams(BaseModel):
    name: Optional[str] = None
    country_id: Optional[int] = None # Filter by registration or availability
    has_license_in_country_id: Optional[int] = None
    has_kyc: Optional[bool] = None
    min_maker_fee: Optional[Decimal] = None
    max_maker_fee: Optional[Decimal] = None
    min_taker_fee: Optional[Decimal] = None
    max_taker_fee: Optional[Decimal] = None
    supports_fiat_id: Optional[int] = None
    supports_language_id: Optional[int] = None
    min_total_review_count: Optional[int] = None
    max_total_review_count: Optional[int] = None
    has_p2p: Optional[bool] = None

class ExchangeSortBy(BaseModel):
    field: Literal['name', 'overall_average_rating', 'trading_volume_24h', 'total_review_count'] = 'overall_average_rating'
    direction: Literal['asc', 'desc'] = 'desc'