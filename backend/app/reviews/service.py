# app/reviews/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, and_, distinct, delete
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Tuple, Dict
from fastapi import HTTPException, status
import datetime
from decimal import Decimal, ROUND_HALF_UP  # Import ROUND_HALF_UP

from app.models import review as review_models
from app.models import exchange as exchange_models
from app.models import user as user_models
from app.models import common as common_models
from app.reviews import schemas
from app.reviews.schemas import ReviewFilterParams, ReviewSortBy, ExchangeReviewCreate, ReviewAdminUpdatePayload
from app.schemas.common import PaginationParams
from app.models.review import ModerationStatusEnum, Review, ReviewRating, ReviewScreenshot, ReviewUsefulnessVote
from app.models.exchange import Exchange, ExchangeCategoryRating
from app.models.common import RatingCategory

class ReviewService:

    async def get_review_by_id(self, db: AsyncSession, review_id: int, load_relations: bool = True) -> Optional[Review]:
        """Fetches a single review by ID, optionally loading relationships."""
        query = select(Review)
        if load_relations:
            query = query.options(
                selectinload(Review.user),
                selectinload(Review.exchange).options(
                    selectinload(Exchange.registration_country)
                ),
                selectinload(Review.ratings).selectinload(ReviewRating.category),
                selectinload(Review.screenshots),
            )
        query = query.filter(Review.id == review_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_reviews(
        self,
        db: AsyncSession,
        filters: ReviewFilterParams,
        sort: ReviewSortBy,
        pagination: PaginationParams,
    ) -> Tuple[List[Review], int]:
        """Lists reviews with filtering, sorting, and pagination."""

        query = select(Review).options(
            selectinload(Review.user),
            selectinload(Review.exchange).selectinload(Exchange.registration_country),
            selectinload(Review.ratings).selectinload(ReviewRating.category),
            selectinload(Review.screenshots),
        )

        count_query = select(func.count(distinct(Review.id)))

        filter_conditions = []
        # Apply filter only if moderation_status is not None
        if filters.moderation_status is not None:
            filter_conditions.append(Review.moderation_status == filters.moderation_status)
            count_query = count_query.filter(Review.moderation_status == filters.moderation_status)

        if filters.exchange_id:
            filter_conditions.append(Review.exchange_id == filters.exchange_id)
            count_query = count_query.filter(Review.exchange_id == filters.exchange_id)
        if filters.user_id:
            filter_conditions.append(Review.user_id == filters.user_id)
            count_query = count_query.filter(Review.user_id == filters.user_id)

        if filters.has_screenshot is not None:
            if filters.has_screenshot:
                # Filter for reviews that HAVE screenshots
                query = query.join(Review.screenshots) # Use join for existence check
                count_query = count_query.join(Review.screenshots)
            else:
                # Filter for reviews that DO NOT HAVE screenshots
                query = query.outerjoin(Review.screenshots).filter(ReviewScreenshot.id == None)
                count_query = count_query.outerjoin(Review.screenshots).filter(ReviewScreenshot.id == None)


        if filter_conditions:
            query = query.filter(and_(*filter_conditions))
            # Count query already has filters applied individually above

        query = query.distinct() # Keep distinct after joins

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        if sort.field == 'created_at':
            order_by_column = Review.created_at
        elif sort.field == 'usefulness':
            # Order by the difference between useful and not useful votes
            order_by_column = (Review.useful_votes_count - Review.not_useful_votes_count)
        else:
            # Default or fallback sorting
            order_by_column = Review.created_at

        if sort.direction == 'desc':
            query = query.order_by(desc(order_by_column))
        else:
            query = query.order_by(asc(order_by_column))

        query = query.offset(pagination.skip).limit(pagination.limit)

        result = await db.execute(query)
        reviews = result.scalars().unique().all() # Use unique() after scalars()

        return reviews, total # Return tuple directly

    async def create_review(
        self,
        db: AsyncSession,
        review_in: ExchangeReviewCreate,
        user_id: int
    ) -> Review:
        """Creates a new review for an exchange."""
        exchange = await db.get(Exchange, review_in.exchange_id)
        if not exchange:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")

        existing_review_query = select(Review.id).filter(
            Review.exchange_id == review_in.exchange_id,
            Review.user_id == user_id
        )
        existing_review = await db.execute(existing_review_query)
        if existing_review.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted a review for this exchange."
            )

        db_review = Review(
            comment=review_in.comment,
            exchange_id=review_in.exchange_id,
            user_id=user_id,
            moderation_status=ModerationStatusEnum.pending
        )
        db.add(db_review)
        await db.flush()

        category_ids = {r.category_id for r in review_in.ratings}
        if len(category_ids) != len(review_in.ratings):
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate rating categories provided.")

        valid_categories_query = select(func.count(RatingCategory.id)).filter(RatingCategory.id.in_(category_ids))
        valid_categories_count = await db.execute(valid_categories_query)
        if valid_categories_count.scalar_one() != len(category_ids):
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more invalid rating category IDs provided.")

        for rating_in in review_in.ratings:
            db_rating = ReviewRating(
                review_id=db_review.id,
                category_id=rating_in.category_id,
                rating_value=rating_in.rating_value
            )
            db.add(db_rating)

        await db.commit()
        created_review = await self.get_review_by_id(db, db_review.id)
        if not created_review:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve created review")
        return created_review

    async def update_review_moderation_details(
        self,
        db: AsyncSession,
        review_id: int,
        update_payload: ReviewAdminUpdatePayload,
        moderator_id: int
    ) -> Optional[Review]:
        """Updates the moderation status and/or notes of a review."""
        db_review = await db.get(Review, review_id)
        if not db_review:
            return None

        needs_update = False
        status_changed = False
        original_status = db_review.moderation_status

        if update_payload.moderation_status is not None and db_review.moderation_status != update_payload.moderation_status:
            db_review.moderation_status = update_payload.moderation_status
            needs_update = True
            status_changed = True

        if update_payload.moderator_notes is not None:
            if db_review.moderator_notes != update_payload.moderator_notes:
                db_review.moderator_notes = update_payload.moderator_notes
                needs_update = True
        elif update_payload.moderator_notes == "" and db_review.moderator_notes is not None:
            db_review.moderator_notes = None
            needs_update = True

        if needs_update:
            db_review.moderated_by_user_id = moderator_id
            db_review.moderated_at = datetime.datetime.utcnow()

            if status_changed:
                if (original_status == ModerationStatusEnum.approved or
                        db_review.moderation_status == ModerationStatusEnum.approved):
                    await self.recalculate_exchange_ratings(db, db_review.exchange_id)

            await db.commit()
            updated_review = await self.get_review_by_id(db, db_review.id)
            return updated_review
        else:
            return await self.get_review_by_id(db, db_review.id)

    async def vote_review_usefulness(
        self,
        db: AsyncSession,
        review_id: int,
        user_id: int,
        is_useful: bool
    ) -> Optional[Review]:
        """Records a user's usefulness vote on a review."""
        db_review = await db.get(Review, review_id)

        if not db_review or db_review.moderation_status != ModerationStatusEnum.approved:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved review not found or not available for voting")

        if db_review.user_id == user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot vote on your own review")

        existing_vote_query = select(ReviewUsefulnessVote).filter_by(review_id=review_id, user_id=user_id)
        vote_result = await db.execute(existing_vote_query)
        vote = vote_result.scalar_one_or_none()

        if vote:
            if vote.is_useful == is_useful:
                return await self.get_review_by_id(db, review_id)

            if is_useful:
                db_review.useful_votes_count += 1
                db_review.not_useful_votes_count -= 1
            else:
                db_review.useful_votes_count -= 1
                db_review.not_useful_votes_count += 1
            vote.is_useful = is_useful
            vote.voted_at = datetime.datetime.utcnow()
        else:
            new_vote = ReviewUsefulnessVote(
                review_id=review_id,
                user_id=user_id,
                is_useful=is_useful
            )
            db.add(new_vote)
            if is_useful:
                db_review.useful_votes_count += 1
            else:
                db_review.not_useful_votes_count += 1

        await db.commit()
        updated_review = await self.get_review_by_id(db, db_review.id)
        if not updated_review:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve review after voting")
        return updated_review

    async def recalculate_exchange_ratings(self, db: AsyncSession, exchange_id: int):
        """
        Recalculates average ratings (overall and per category) for an exchange
        based on its currently *approved* reviews. Updates the Exchange and
        ExchangeCategoryRating models.
        """
        print(f"INFO: Recalculating ratings for exchange ID {exchange_id}")

        # Fetch the target exchange first to ensure it exists
        # Eagerly load existing category ratings to optimize updates/deletes
        exchange = await db.get(
            Exchange,
            exchange_id,
            options=[selectinload(Exchange.category_ratings)]
        )
        if not exchange:
            print(f"ERROR: Exchange {exchange_id} not found during rating recalculation.")
            # Consider raising an exception or returning early if appropriate
            return

        # Query to get all approved reviews and their ratings/categories for the exchange
        approved_reviews_query = select(Review).options(
            selectinload(Review.ratings).selectinload(ReviewRating.category)
        ).filter(
            Review.exchange_id == exchange_id,
            Review.moderation_status == ModerationStatusEnum.approved
        )
        approved_reviews_result = await db.execute(approved_reviews_query)
        approved_reviews = approved_reviews_result.scalars().unique().all()

        total_approved_reviews = len(approved_reviews)
        all_rating_values: List[Decimal] = []
        # Use Decimal for sums to maintain precision
        category_ratings_data: Dict[int, Dict[str, Decimal | int | RatingCategory]] = {}

        # Aggregate ratings from all approved reviews
        for review in approved_reviews:
            for rating in review.ratings:
                # Ensure rating_value is Decimal
                rating_value_decimal = Decimal(rating.rating_value)
                all_rating_values.append(rating_value_decimal)

                cat_id = rating.category_id
                if cat_id not in category_ratings_data:
                    # Ensure category is loaded if needed (fallback)
                    category_obj = rating.category
                    if not category_obj:
                        category_obj = await db.get(RatingCategory, cat_id)
                        if not category_obj:
                            print(f"WARN: RatingCategory {cat_id} not found for review {review.id}. Skipping this rating.")
                            continue # Skip if category doesn't exist

                    category_ratings_data[cat_id] = {
                        'sum': Decimal(0),
                        'count': 0,
                        'category': category_obj # Store the category object
                    }

                category_ratings_data[cat_id]['sum'] += rating_value_decimal
                category_ratings_data[cat_id]['count'] += 1

        # Calculate overall average rating, handling division by zero and rounding
        overall_average_rating_decimal: Optional[Decimal] = None
        if all_rating_values:
            raw_overall_average = sum(all_rating_values) / Decimal(len(all_rating_values))
            # Quantize to match model precision (e.g., Numeric(3, 2) -> two decimal places)
            overall_average_rating_decimal = raw_overall_average.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            overall_average_rating_decimal = Decimal("0.00") # Default to 0.00 if no ratings

        # Calculate category averages, handling division by zero and rounding
        category_averages: Dict[int, Dict] = {}
        for cat_id, data in category_ratings_data.items():
            count = data['count']
            if isinstance(count, int) and count > 0:
                category_sum = data['sum']
                if isinstance(category_sum, Decimal):
                    raw_category_average = category_sum / Decimal(count)
                    # Quantize to match model precision
                    quantized_average = raw_category_average.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    category_averages[cat_id] = {
                        'average': quantized_average,
                        'count': count,
                        'category': data['category'] # Use stored category object
                    }

        # --- Update Exchange ---
        # Use correct model field names
        exchange.overall_average_rating = overall_average_rating_decimal
        exchange.total_review_count = total_approved_reviews

        # --- Update/Create/Delete ExchangeCategoryRating ---
        existing_cat_ratings_map = {cr.category_id: cr for cr in exchange.category_ratings}
        processed_category_ids = set()
        now = datetime.datetime.utcnow() # Use a consistent timestamp

        for cat_id, data in category_averages.items():
            processed_category_ids.add(cat_id)
            average_rating = data['average']
            review_count = data['count']

            if cat_id in existing_cat_ratings_map:
                # Update existing category rating
                existing_rating = existing_cat_ratings_map[cat_id]
                existing_rating.average_rating = average_rating
                existing_rating.review_count = review_count
                existing_rating.last_updated = now
            else:
                # Create new category rating
                new_cat_rating = exchange_models.ExchangeCategoryRating(
                    exchange_id=exchange_id,
                    category_id=cat_id,
                    average_rating=average_rating,
                    review_count=review_count,
                    last_updated=now
                )
                db.add(new_cat_rating)
                # Add to the exchange's collection if needed, though flush/commit should handle it
                # exchange.category_ratings.append(new_cat_rating)

        # --- Delete Obsolete ExchangeCategoryRating ---
        category_ids_to_remove = set(existing_cat_ratings_map.keys()) - processed_category_ids
        if category_ids_to_remove:
            # Delete directly using a query for efficiency
            await db.execute(
                delete(exchange_models.ExchangeCategoryRating).where(
                    exchange_models.ExchangeCategoryRating.exchange_id == exchange_id,
                    exchange_models.ExchangeCategoryRating.category_id.in_(category_ids_to_remove)
                )
            )
            # Also remove from the loaded relationship collection if necessary
            # exchange.category_ratings = [cr for cr in exchange.category_ratings if cr.category_id not in category_ids_to_remove]


        # Flush changes within this unit of work. Commit should happen outside.
        await db.flush()
        print(f"INFO: Ratings recalculated for exchange ID {exchange_id}. Overall: {exchange.overall_average_rating}, Total Approved Reviews: {exchange.total_review_count}")

review_service = ReviewService()