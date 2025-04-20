# app/common/router.py
from fastapi import APIRouter, Depends
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

@router.get("/fiat_currencies", response_model=List[common_schemas.FiatCurrencyRead])
async def list_fiat_currencies(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a list of all available fiat currencies.
    """
    currencies = await service.common_service.get_all_fiat_currencies(db=db)
    return currencies
