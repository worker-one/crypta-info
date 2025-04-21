# app/exchanges/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, or_, and_
from sqlalchemy.orm import selectinload, joinedload # For eager loading
from typing import List, Optional, Tuple
from decimal import Decimal

from app.models import exchange as exchange_models
from app.models import common as common_models
from app.exchanges import schemas
from app.schemas.common import PaginationParams
import logging

class ExchangeService:

    async def get_exchange_by_slug(self, db: AsyncSession, slug: str) -> Optional[exchange_models.Exchange]:
        query = select(exchange_models.Exchange).options(
            selectinload(exchange_models.Exchange.registration_country),
            selectinload(exchange_models.Exchange.headquarters_country),
            selectinload(exchange_models.Exchange.available_in_countries),
            selectinload(exchange_models.Exchange.languages),
            selectinload(exchange_models.Exchange.supported_fiat_currencies),
            selectinload(exchange_models.Exchange.licenses).selectinload(exchange_models.License.jurisdiction_country),
            selectinload(exchange_models.Exchange.social_links),
            selectinload(exchange_models.Exchange.category_ratings).selectinload(exchange_models.ExchangeCategoryRating.category),
        ).filter(exchange_models.Exchange.slug == slug)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_exchange_by_name(self, db: AsyncSession, name: str) -> Optional[exchange_models.Exchange]:
        result = await db.execute(select(exchange_models.Exchange).filter(exchange_models.Exchange.name == name))
        return result.scalar_one_or_none()


    async def list_exchanges(
        self,
        db: AsyncSession,
        filters: schemas.ExchangeFilterParams,
        sort: schemas.ExchangeSortBy,
        pagination: PaginationParams,
    ) -> Tuple[List[exchange_models.Exchange], int]:

        query = select(exchange_models.Exchange).options(
            # Eager load only necessary fields for list view
            selectinload(exchange_models.Exchange.registration_country)
        )

        # --- Filtering ---
        filter_conditions = []
        if filters.name:
            filter_conditions.append(exchange_models.Exchange.name.ilike(f"%{filters.name}%"))
        if filters.kyc_type:
            filter_conditions.append(exchange_models.Exchange.kyc_type == filters.kyc_type)
        if filters.has_p2p is not None:
            filter_conditions.append(exchange_models.Exchange.has_p2p == filters.has_p2p)

        # Fee filtering (example)
        if filters.min_maker_fee is not None:
            filter_conditions.append(exchange_models.Exchange.maker_fee_max >= filters.min_maker_fee) # Check max is >= min requested
        if filters.max_maker_fee is not None:
            filter_conditions.append(exchange_models.Exchange.maker_fee_min <= filters.max_maker_fee) # Check min is <= max requested
        # Add similar for taker fees
        if filters.min_taker_fee is not None:
            filter_conditions.append(exchange_models.Exchange.taker_fee_max >= filters.min_taker_fee)
        if filters.max_taker_fee is not None:
            filter_conditions.append(exchange_models.Exchange.taker_fee_min <= filters.max_taker_fee)

        # Review count filtering
        if filters.min_total_review_count is not None:
            filter_conditions.append(exchange_models.Exchange.total_review_count >= filters.min_total_review_count)
        if filters.max_total_review_count is not None:
            filter_conditions.append(exchange_models.Exchange.total_review_count <= filters.max_total_review_count)


        # Filtering by relationships requires joins or subqueries
        if filters.country_id:
            # Example: Filter if registered OR available in country_id
            query = query.outerjoin(exchange_models.exchange_availability_table).outerjoin(
                common_models.Country, exchange_models.exchange_availability_table.c.country_id == common_models.Country.id
            )
            filter_conditions.append(
                or_(
                    exchange_models.Exchange.registration_country_id == filters.country_id,
                    exchange_models.exchange_availability_table.c.country_id == filters.country_id
                )
            )

        if filters.has_license_in_country_id:
             query = query.join(exchange_models.License) # Inner join ensures only exchanges with licenses
             filter_conditions.append(exchange_models.License.jurisdiction_country_id == filters.has_license_in_country_id)

        if filters.supports_fiat_id:
            query = query.join(exchange_models.exchange_fiat_support_table)
            filter_conditions.append(exchange_models.exchange_fiat_support_table.c.fiat_currency_id == filters.supports_fiat_id)

        if filters.supports_language_id:
            query = query.join(exchange_models.exchange_languages_table)
            filter_conditions.append(exchange_models.exchange_languages_table.c.language_id == filters.supports_language_id)

        if filter_conditions:
             query = query.where(and_(*filter_conditions)).distinct() # Use distinct because of joins


        # --- Count Total ---
        count_query = select(func.count(exchange_models.Exchange.id))
        if filter_conditions: # Apply same filters to count query
            # Reconstruct joins/filters for count or use the filtered query as subquery
             count_query = count_query.select_from(query.subquery()) # Simpler approach

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # --- Sorting ---
        sort_column = getattr(exchange_models.Exchange, sort.field)
        if sort.direction == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # --- Pagination ---
        query = query.offset(pagination.skip).limit(pagination.limit)

        # --- Execute Query ---
        result = await db.execute(query)
        exchanges = result.scalars().all()

        return exchanges, total

    # --- CRUD (Likely Admin Only) ---
    async def create_exchange(self, db: AsyncSession, exchange_in: schemas.ExchangeCreate) -> exchange_models.Exchange:
        logger = logging.getLogger(__name__)
        
        logger.info(f"Creating new exchange with name: {exchange_in.name}, slug: {exchange_in.slug}")
        
        # Check slug uniqueness
        existing = await self.get_exchange_by_slug(db, exchange_in.slug)
        if existing:
            logger.warning(f"Exchange creation failed: slug '{exchange_in.slug}' already exists")
            raise ValueError(f"Exchange slug '{exchange_in.slug}' already exists.")
            
        existing_name = await self.get_exchange_by_name(db, exchange_in.name)
        if existing_name:
            logger.warning(f"Exchange creation failed: name '{exchange_in.name}' already exists")
            raise ValueError(f"Exchange name '{exchange_in.name}' already exists.")

        logger.info(f"Creating exchange object with data: {exchange_in.model_dump()}")
        db_exchange = exchange_models.Exchange(**exchange_in.model_dump(exclude={ # Exclude M2M IDs
            "available_in_country_ids", "language_ids", "supported_fiat_currency_ids"
        }))

        # Add M2M relationships (requires fetching related objects)
        # Simplified - assumes IDs are valid. Add validation if needed.
        if exchange_in.available_in_country_ids:
            logger.info(f"Adding {len(exchange_in.available_in_country_ids)} availability countries")
            countries = await db.execute(select(common_models.Country).filter(common_models.Country.id.in_(exchange_in.available_in_country_ids)))
            db_exchange.available_in_countries.extend(countries.scalars().all())
            
        if exchange_in.language_ids:
            logger.info(f"Adding {len(exchange_in.language_ids)} languages")
            langs = await db.execute(select(common_models.Language).filter(common_models.Language.id.in_(exchange_in.language_ids)))
            db_exchange.languages.extend(langs.scalars().all())
            
        if exchange_in.supported_fiat_currency_ids:
            logger.info(f"Adding {len(exchange_in.supported_fiat_currency_ids)} fiat currencies")
            fiats = await db.execute(select(common_models.FiatCurrency).filter(common_models.FiatCurrency.id.in_(exchange_in.supported_fiat_currency_ids)))
            db_exchange.supported_fiat_currencies.extend(fiats.scalars().all())


        db.add(db_exchange)
        await db.commit()
        await db.refresh(db_exchange, attribute_names=[ # Refresh needed relationships
            'registration_country', 'headquarters_country' # Example
        ])
        # Re-fetch full details if needed for the response
        return await self.get_exchange_by_slug(db, db_exchange.slug) # Fetch again with all relations


    async def update_exchange(self, db: AsyncSession, db_exchange: exchange_models.Exchange, exchange_in: schemas.ExchangeUpdate) -> exchange_models.Exchange:
        """
        Update an existing exchange with new data.
        """
        # Check if name is changed and if it conflicts with existing exchange
        if exchange_in.name and exchange_in.name != db_exchange.name:
            existing_name = await self.get_exchange_by_name(db, exchange_in.name)
            if existing_name and existing_name.id != db_exchange.id:
                raise ValueError(f"Exchange name '{exchange_in.name}' already exists.")
        
        # Update direct fields
        update_data = exchange_in.model_dump(exclude={
            "available_in_country_ids", "language_ids", "supported_fiat_currency_ids"
        }, exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_exchange, key, value)
        
        # Update M2M relationships
        if exchange_in.available_in_country_ids is not None:
            # Clear existing relationships and add new ones
            db_exchange.available_in_countries = []
            if exchange_in.available_in_country_ids:
                countries = await db.execute(select(common_models.Country).filter(
                    common_models.Country.id.in_(exchange_in.available_in_country_ids)
                ))
                db_exchange.available_in_countries.extend(countries.scalars().all())
        
        if exchange_in.language_ids is not None:
            db_exchange.languages = []
            if exchange_in.language_ids:
                langs = await db.execute(select(common_models.Language).filter(
                    common_models.Language.id.in_(exchange_in.language_ids)
                ))
                db_exchange.languages.extend(langs.scalars().all())
        
        if exchange_in.supported_fiat_currency_ids is not None:
            db_exchange.supported_fiat_currencies = []
            if exchange_in.supported_fiat_currency_ids:
                fiats = await db.execute(select(common_models.FiatCurrency).filter(
                    common_models.FiatCurrency.id.in_(exchange_in.supported_fiat_currency_ids)
                ))
                db_exchange.supported_fiat_currencies.extend(fiats.scalars().all())
        
        await db.commit()
        await db.refresh(db_exchange)
        
        # Re-fetch full details with all relations
        return await self.get_exchange_by_slug(db, db_exchange.slug)

    async def delete_exchange(self, db: AsyncSession, exchange_id: int) -> None:
        """
        Delete an exchange by ID.
        """
        # Find the exchange
        db_exchange = await db.get(exchange_models.Exchange, exchange_id)
        if db_exchange:
            # Delete the exchange
            await db.delete(db_exchange)
            await db.commit()
            return True
        return False


exchange_service = ExchangeService()