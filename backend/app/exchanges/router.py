# app/exchanges/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_async_db
from app.exchanges import schemas, service
from app.schemas.common import PaginationParams, PaginatedResponse
from app.models.exchange import KYCTypeEnum
from app.dependencies import get_current_admin_user
from app.models.user import User

router = APIRouter(
    prefix="/exchanges",
    tags=["Exchanges"]
)

@router.get("/go/{slug}", status_code=status.HTTP_302_FOUND, tags=["Redirects"], include_in_schema=False)
async def redirect_to_exchange_website(
    slug: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Redirects the user to the official website of the exchange
    identified by the slug. This endpoint is typically used for tracking
    or masking the direct URL.
    """
    db_exchange = await service.exchange_service.get_exchange_by_slug(db, slug=slug)

    if not db_exchange:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")

    if not db_exchange.website_url:
        fallback_url = f"/exchange/overview.html?slug={slug}"
        return RedirectResponse(url=fallback_url, status_code=status.HTTP_302_FOUND)

    return RedirectResponse(url=db_exchange.website_url)

@router.get("/", response_model=PaginatedResponse[schemas.ExchangeReadBrief])
async def list_exchanges(
    db: AsyncSession = Depends(get_async_db),
    # Filtering parameters as query params
    name: Optional[str] = Query(None, description="Search by exchange name (partial match)"),
    country_id: Optional[int] = Query(None, description="Filter by registration or availability country ID"),
    has_license_in_country_id: Optional[int] = Query(None, description="Filter by country ID where the exchange holds a license"),
    kyc_type: Optional[KYCTypeEnum] = Query(None, description="Filter by KYC type"),
    min_maker_fee: Optional[Decimal] = Query(None, description="Minimum maker fee threshold"),
    max_maker_fee: Optional[Decimal] = Query(None, description="Maximum maker fee threshold"),
    min_taker_fee: Optional[Decimal] = Query(None, description="Minimum taker fee threshold"),
    max_taker_fee: Optional[Decimal] = Query(None, description="Maximum taker fee threshold"),
    supports_fiat_id: Optional[int] = Query(None, description="Filter by supported fiat currency ID"),
    supports_language_id: Optional[int] = Query(None, description="Filter by supported language ID"),
    has_p2p: Optional[bool] = Query(None, description="Filter by P2P platform availability"),
    min_total_review_count: Optional[int] = Query(None, description="Minimum total review count"),
    # Sorting parameters
    sort_by: schemas.ExchangeSortBy = Depends(),
    # Pagination parameters
    pagination: PaginationParams = Depends(),
):
    """
    Get a list of cryptocurrency exchanges with filtering, sorting, and pagination.
    """
    filters = schemas.ExchangeFilterParams(
        name=name,
        country_id=country_id,
        has_license_in_country_id=has_license_in_country_id,
        kyc_type=kyc_type,
        min_maker_fee=min_maker_fee,
        max_maker_fee=max_maker_fee,
        min_taker_fee=min_taker_fee,
        max_taker_fee=max_taker_fee,
        supports_fiat_id=supports_fiat_id,
        supports_language_id=supports_language_id,
        has_p2p=has_p2p,
        min_total_review_count=min_total_review_count,
    )

    exchanges, total = await service.exchange_service.list_exchanges(
        db=db, filters=filters, sort=sort_by, pagination=pagination
    )

    return PaginatedResponse(
        total=total,
        items=exchanges,
        skip=pagination.skip,
        limit=pagination.limit,
    )


@router.get("/{slug}", response_model=schemas.ExchangeRead)
async def get_exchange_details(
    slug: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get detailed information about a specific exchange by its slug.
    """
    db_exchange = await service.exchange_service.get_exchange_by_slug(db, slug=slug)
    if db_exchange is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")
    return db_exchange

