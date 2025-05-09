# app/reviews/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, and_, distinct, func, select, text
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
import datetime
import logging # Import logging

from app.reviews.schemas import ReviewFilterParams, ReviewSortBy, ItemReviewCreate, ReviewAdminUpdatePayload
from app.schemas.common import PaginationParams
from app.models.review import ModerationStatusEnum, Review, ReviewScreenshot, ReviewUsefulnessVote
from app.models.item import Item # Import Item model

# Get logger and configure it properly
logger = logging.getLogger(__name__)
# Ensure the logger has a handler and proper log level
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class ReviewService:

    async def _update_item_review_stats(self, db: AsyncSession, item_id: int):
        """
        Recalculates and updates the total_review_count and overall_average_rating
        for a given item based on its approved reviews.
        total_review_count only includes reviews with non-null comments.
        total_rating_count includes all reviews (with or without comments).
        """
        logger.info(f"Updating review stats for item_id: {item_id}")
        # Query to get count of approved reviews with comments and average rating of all approved reviews
        stmt = (
            select(
                func.count(Review.id).filter(Review.comment.is_not(None)).label("approved_count_with_comments"),
                func.count(Review.id).label("total_approved_count"),
                func.avg(Review.rating).label("average_rating")
            )
            .where(Review.item_id == item_id)
            .where(Review.moderation_status == ModerationStatusEnum.approved)
        )
        result = await db.execute(stmt)
        stats = result.first() # Use first() as it returns one row or None

        approved_count_with_comments = stats.approved_count_with_comments if stats else 0
        total_approved_count = stats.total_approved_count if stats else 0
        average_rating = stats.average_rating if stats and stats.average_rating is not None else 0.0

        # Fetch the item
        item = await db.get(Item, item_id)
        if item:
            logger.info(f"Updating item {item_id}: count_with_comments={approved_count_with_comments}, total_count={total_approved_count}, avg_rating={average_rating:.2f}")
            item.total_review_count = approved_count_with_comments
            item.total_rating_count = total_approved_count
            # Ensure rating is stored appropriately (e.g., as float or decimal)
            item.overall_average_rating = float(average_rating)
            db.add(item) # Add item to session to ensure update is tracked
            
            # Add an explicit commit to persist the changes to the database
            try:
                await db.commit()
                logger.info(f"Successfully committed updated stats for item {item_id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to commit item stats update: {e}", exc_info=True)
                raise
        else:
            logger.warning(f"Item with id {item_id} not found while trying to update review stats.")

    async def get_review_by_id(self, db: AsyncSession, review_id: int, load_relations: bool = True) -> Optional[Review]:
        """Fetches a single review by ID, optionally loading relationships."""
        query = select(Review)
        if load_relations:
            query = query.options(
                selectinload(Review.user),
                selectinload(Review.item),
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
            selectinload(Review.item),
            selectinload(Review.screenshots),
        )

        count_query = select(func.count(distinct(Review.id)))

        filter_conditions = []
        # Apply filter only if moderation_status is not None
        if filters.moderation_status is not None:
            filter_conditions.append(Review.moderation_status == filters.moderation_status)
            count_query = count_query.filter(Review.moderation_status == filters.moderation_status)

        if filters.item_id:
            filter_conditions.append(Review.item_id == filters.item_id)
            count_query = count_query.filter(Review.item_id == filters.item_id)
        if filters.user_id:
            filter_conditions.append(Review.user_id == filters.user_id)
            count_query = count_query.filter(Review.user_id == filters.user_id)

        # Add rating filters
        if filters.min_rating is not None:
            filter_conditions.append(Review.rating >= filters.min_rating)
            count_query = count_query.filter(Review.rating >= filters.min_rating)
        if filters.max_rating is not None:
            filter_conditions.append(Review.rating <= filters.max_rating)
            count_query = count_query.filter(Review.rating <= filters.max_rating)

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
        elif sort.field == 'rating': # Add sorting by rating
            order_by_column = Review.rating
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
        review_in: ItemReviewCreate,
        user_id: Optional[int] # Changed to Optional[int]
    ) -> Review:
        """Creates a new review for an item and updates the item's review statistics."""
        logger.info(f"Creating review for item_id: {review_in.item_id} by user_id: {user_id}")
        item = await db.get(Item, review_in.item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

        # Validation for user_id and guest_name
        if user_id and review_in.guest_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit review as both a logged-in user and a guest. Do not provide guest_name if authenticated."
            )
        if not user_id and not review_in.guest_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A review must be associated with a user or a guest_name must be provided."
            )
        if not user_id and review_in.guest_name and not review_in.guest_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guest name cannot be empty or whitespace."
            )


        db_review = Review(
            comment=review_in.comment,
            rating=review_in.rating, # Store the single rating
            item_id=review_in.item_id,
            user_id=user_id,
            guest_name=review_in.guest_name if not user_id else None,
            moderation_status=review_in.moderation_status
        )
        db.add(db_review)

        try:
            await db.commit()
            logger.info(f"Successfully committed review for item_id: {review_in.item_id}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create review: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not create review: {e}")

        # Fetch the created review with relationships loaded
        created_review = await self.get_review_by_id(db, db_review.id)
        if not created_review:
            logger.error(f"Failed to retrieve created review after commit for item_id: {review_in.item_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve created review after commit")
        
        logger.info(f"Created review: {created_review.id} for item_id: {review_in.item_id}")
        
        try:
            logger.info(f"Attempting to update item review stats for item_id: {review_in.item_id}")
            await self._update_item_review_stats(db, review_in.item_id)
            logger.info(f"Successfully updated review stats for item_id: {review_in.item_id}")
        except Exception as e:
            logger.error(f"Error updating item review stats: {e}", exc_info=True)
            # Consider whether to re-raise or just log the error
            
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

        original_status = db_review.moderation_status
        item_id = db_review.item_id # Store item_id before potential changes
        needs_update = False
        status_changed = False # Flag to track if status specifically changed

        if update_payload.moderation_status is not None and db_review.moderation_status != update_payload.moderation_status:
            db_review.moderation_status = update_payload.moderation_status
            needs_update = True
            status_changed = True # Status has changed

        if update_payload.moderator_notes is not None:
            # Allow setting notes to empty string which translates to None/null in DB
            new_notes = update_payload.moderator_notes if update_payload.moderator_notes else None
            if db_review.moderator_notes != new_notes:
                db_review.moderator_notes = new_notes
                needs_update = True

        if needs_update:
            db_review.moderated_by_user_id = moderator_id
            db_review.moderated_at = datetime.datetime.utcnow()

            # Check if the status change involves the 'approved' state
            should_update_stats = status_changed and (
                original_status == ModerationStatusEnum.approved or
                db_review.moderation_status == ModerationStatusEnum.approved
            )

            if should_update_stats:
                # Update item stats before committing
                await self._update_item_review_stats(db, item_id)

            try:
                await db.commit()
                # Refresh the review instance to get potentially updated relationship data
                # or data generated by DB triggers/defaults if any.
                await db.refresh(db_review)
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update review moderation details for review {review_id}: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update review moderation details.")

            # Fetch the potentially updated review with relations after commit
            updated_review_with_relations = await self.get_review_by_id(db, db_review.id)
            return updated_review_with_relations
        else:
            # If no update was needed, just return the review as it was fetched
            # (potentially loading relations if they weren't loaded initially)
            return await self.get_review_by_id(db, db_review.id)

    async def vote_review_usefulness(
        self,
        db: AsyncSession,
        review_id: int,
        user_id: int,
        is_useful: bool
    ) -> Optional[Review]:
        """Records a user's usefulness vote on a review."""
        review_query = select(Review).filter(
            Review.id == review_id,
            Review.moderation_status == ModerationStatusEnum.approved
        )
        review_result = await db.execute(review_query)
        db_review = review_result.scalar_one_or_none()

        if not db_review:
            exists_query = select(Review.id).filter(Review.id == review_id)
            exists_result = await db.execute(exists_query)
            if exists_result.scalar_one_or_none():
                 raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Review is not approved for voting")
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

        existing_vote_query = select(ReviewUsefulnessVote).filter_by(review_id=review_id, user_id=user_id)
        vote_result = await db.execute(existing_vote_query)
        vote = vote_result.scalar_one_or_none()

        change_occurred = False
        if vote:
            if vote.is_useful != is_useful:
                if is_useful:
                    db_review.useful_votes_count += 1
                    db_review.not_useful_votes_count -= 1
                else:
                    db_review.useful_votes_count -= 1
                    db_review.not_useful_votes_count += 1
                vote.is_useful = is_useful
                vote.voted_at = datetime.datetime.utcnow()
                change_occurred = True
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
            change_occurred = True

        if change_occurred:
            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record vote.")

        updated_review = await self.get_review_by_id(db, review_id)
        if not updated_review:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve review after voting operation")
        return updated_review

review_service = ReviewService()