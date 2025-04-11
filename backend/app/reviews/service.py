# app/reviews/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, and_
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Tuple
from fastapi import HTTPException, status

from app.models import review as review_models
from app.models import exchange as exchange_models
from app.models import user as user_models
from app.models import common as common_models
from app.reviews import schemas
from app.schemas.common import PaginationParams
from app.models.review import ModerationStatusEnum

class ReviewService:

    async def get_review_by_id(self, db: AsyncSession, review_id: int, load_relations: bool = True) -> Optional[review_models.Review]:
        query = select(review_models.Review)
        if load_relations:
            query = query.options(
                selectinload(review_models.Review.user),
                selectinload(review_models.Review.exchange).selectinload(exchange_models.Exchange.registration_country), # Example nested load
                selectinload(review_models.Review.ratings).selectinload(review_models.ReviewRating.category),
                selectinload(review_models.Review.screenshots),
                # selectinload(review_models.Review.tags)
            )
        query = query.filter(review_models.Review.id == review_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_reviews(
        self,
        db: AsyncSession,
        filters: schemas.ReviewFilterParams,
        sort: schemas.ReviewSortBy,
        pagination: PaginationParams,
    ) -> Tuple[List[review_models.Review], int]:

        query = select(review_models.Review).options(
            # Eager load necessary fields for list view
            selectinload(review_models.Review.user),
            selectinload(review_models.Review.exchange).selectinload(exchange_models.Exchange.registration_country),
            selectinload(review_models.Review.ratings).selectinload(review_models.ReviewRating.category),
             selectinload(review_models.Review.screenshots),
            # selectinload(review_models.Review.tags),
        )

        # --- Filtering ---
        filter_conditions = [review_models.Review.moderation_status == filters.moderation_status] # Base filter

        if filters.exchange_id:
            filter_conditions.append(review_models.Review.exchange_id == filters.exchange_id)
        if filters.user_id:
             filter_conditions.append(review_models.Review.user_id == filters.user_id)
        if filters.has_screenshot is not None:
            if filters.has_screenshot:
                query = query.join(review_models.Review.screenshots) # Join needed if filtering on existence
            else:
                 query = query.outerjoin(review_models.Review.screenshots)
                 filter_conditions.append(review_models.ReviewScreenshot.id == None) # Check no screenshot exists

        # Rating filters require joining ratings and calculating average - complex, simplified here
        # if filters.min_overall_rating or filters.max_overall_rating:
        #     # Requires subquery or window function to calculate avg rating per review
        #     pass

        if filter_conditions:
             query = query.where(and_(*filter_conditions)).distinct()


        # --- Count Total ---
        count_query = select(func.count(review_models.Review.id))
        if filter_conditions:
            count_query = count_query.select_from(query.subquery())

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # --- Sorting ---
        if sort.field == 'created_at':
            sort_column = review_models.Review.created_at
        elif sort.field == 'usefulness':
            # Calculate usefulness score (useful - not_useful)
            sort_column = (review_models.Review.useful_votes_count - review_models.Review.not_useful_votes_count)
        else:
            sort_column = review_models.Review.created_at # Default

        if sort.direction == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # --- Pagination ---
        query = query.offset(pagination.skip).limit(pagination.limit)

        # --- Execute Query ---
        result = await db.execute(query)
        reviews = result.scalars().unique().all() # Use unique() because of potential duplicate rows from joins

        return reviews, total

    async def create_review(
        self,
        db: AsyncSession,
        review_in: schemas.ReviewCreate,
        user_id: int
    ) -> review_models.Review:
        # Check if user already reviewed this exchange? (Optional rule)
        # Check if exchange exists
        exchange = await db.get(exchange_models.Exchange, review_in.exchange_id)
        if not exchange:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange not found")

        # Create review object
        db_review = review_models.Review(
            comment=review_in.comment,
            exchange_id=review_in.exchange_id,
            user_id=user_id,
            moderation_status=ModerationStatusEnum.pending # Default to pending moderation
        )
        db.add(db_review)
        # We need the review ID before adding ratings/screenshots, so commit partially or flush
        await db.flush() # Get the ID without ending transaction

        # Create related ratings
        category_ids = {r.category_id for r in review_in.ratings}
        if len(category_ids) != len(review_in.ratings):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate rating categories provided.")

        # Check if category IDs are valid (optional but good)
        valid_categories = await db.execute(select(common_models.RatingCategory.id).filter(common_models.RatingCategory.id.in_(category_ids)))
        if len(valid_categories.scalars().all()) != len(category_ids):
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid rating category ID provided.")

        for rating_in in review_in.ratings:
            db_rating = review_models.ReviewRating(
                review_id=db_review.id,
                category_id=rating_in.category_id,
                rating_value=rating_in.rating_value
            )
            db.add(db_rating)

        # Handle screenshots (basic URL storage shown)
        # if review_in.screenshot_urls:
        #     for url in review_in.screenshot_urls:
        #         db_screenshot = review_models.ReviewScreenshot(review_id=db_review.id, file_url=str(url))
        #         db.add(db_screenshot)

        await db.commit()
        # Refresh to load relations created within the transaction (like ratings)
        await db.refresh(db_review, attribute_names=['ratings'])
        # Re-fetch the full review with all necessary relations for the response
        return await self.get_review_by_id(db, db_review.id)


    async def moderate_review(
        self,
        db: AsyncSession,
        review_id: int,
        moderation_data: schemas.ReviewUpdateAdmin,
        moderator_id: int
    ) -> Optional[review_models.Review]:
        db_review = await self.get_review_by_id(db, review_id, load_relations=False) # Don't need full load
        if not db_review:
            return None

        update_data = moderation_data.model_dump(exclude_unset=True)
        needs_update = False
        if "moderation_status" in update_data and db_review.moderation_status != update_data["moderation_status"]:
            db_review.moderation_status = update_data["moderation_status"]
            needs_update = True
        if "moderator_notes" in update_data:
             db_review.moderator_notes = update_data["moderator_notes"]
             needs_update = True

        if needs_update:
            db_review.moderated_by_user_id = moderator_id
            db_review.moderated_at = func.now()
            await db.commit()
            await db.refresh(db_review) # Refresh to get db generated time if needed

            # !!! IMPORTANT: Trigger rating recalculation for the exchange !!!
            # This should ideally happen in a background task
            # await self.recalculate_exchange_ratings(db, db_review.exchange_id)

        return db_review

    async def vote_review_usefulness(
        self,
        db: AsyncSession,
        review_id: int,
        user_id: int,
        is_useful: bool
    ) -> Optional[review_models.Review]:
        # Check if review exists and is approved
        db_review = await db.get(review_models.Review, review_id)
        if not db_review or db_review.moderation_status != ModerationStatusEnum.approved:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved review not found")

        # Prevent self-voting
        if db_review.user_id == user_id:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot vote on your own review")

        # Check if user already voted
        existing_vote = await db.execute(
            select(review_models.ReviewUsefulnessVote)
            .filter_by(review_id=review_id, user_id=user_id)
        )
        vote = existing_vote.scalar_one_or_none()

        if vote:
            # User is changing their vote
            if vote.is_useful == is_useful:
                return db_review # No change needed

            # Update vote and counts
            if is_useful:
                db_review.useful_votes_count += 1
                db_review.not_useful_votes_count -= 1
            else:
                db_review.useful_votes_count -= 1
                db_review.not_useful_votes_count += 1
            vote.is_useful = is_useful
            vote.voted_at = func.now()
        else:
            # New vote
            new_vote = review_models.ReviewUsefulnessVote(
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
        await db.refresh(db_review)
        return db_review

    # Placeholder for recalculation logic (should be more robust)
    async def recalculate_exchange_ratings(self, db: AsyncSession, exchange_id: int):
        # This is complex: needs to query approved reviews for the exchange,
        # calculate average for overall and each category, update Exchange
        # and ExchangeCategoryRating tables. Best done asynchronously.
        print(f"INFO: Triggered recalculation for exchange ID {exchange_id} (implementation needed)")
        pass


review_service = ReviewService()