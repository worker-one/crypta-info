# app/common/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_async_db
from app.schemas import common as common_schemas
from app.common import service

router = APIRouter(
    tags=["Common Data"],
    prefix="/common",  # This router is included at the root level
    # No prefix here, so endpoints are /countries and /fiat_currencies under the included path
)

@router.get("/countries", response_model=List[common_schemas.CountryRead])
async def list_countries(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a list of all available countries.
    """
    countries = await service.common_service.get_all_countries(db=db)
    return countries

@router.get("/countries/{country_id}", response_model=common_schemas.CountryRead)
async def get_country(
    country_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific country by its ID.
    """
    country = await service.common_service.get_country_by_id(db=db, country_id=country_id)
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    return country

@router.get("/fiat_currencies", response_model=List[common_schemas.FiatCurrencyRead])
async def list_fiat_currencies(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a list of all available fiat currencies.
    """
    currencies = await service.common_service.get_all_fiat_currencies(db=db)
    return currencies

@router.get("/fiat_currencies/{currency_id}", response_model=common_schemas.FiatCurrencyRead)
async def get_fiat_currency(
    currency_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific fiat currency by its ID.
    """
    currency = await service.common_service.get_fiat_currency_by_id(db=db, currency_id=currency_id)
    if not currency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiat currency not found")
    return currency
