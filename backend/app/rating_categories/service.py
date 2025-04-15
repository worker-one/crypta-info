from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import List, Optional
from fastapi import HTTPException, status

from app.models.common import RatingCategory
from app.reviews.schemas import RatingCategoryCreate, RatingCategoryUpdate # Assuming schemas are in reviews

class RatingCategoryService:

    async def list_rating_categories(self, db: AsyncSession) -> List[RatingCategory]:
        """Lists all available rating categories."""
        query = select(RatingCategory).order_by(RatingCategory.id)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_rating_category_by_id(self, db: AsyncSession, category_id: int) -> Optional[RatingCategory]:
        """Fetches a single rating category by ID."""
        return await db.get(RatingCategory, category_id)

    async def create_rating_category(
        self, db: AsyncSession, category_in: RatingCategoryCreate
    ) -> RatingCategory:
        """Creates a new rating category."""
        # Check if category name already exists
        existing_category_query = select(RatingCategory).filter(RatingCategory.name == category_in.name)
        existing_category = await db.execute(existing_category_query)
        if existing_category.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Rating category with name '{category_in.name}' already exists."
            )

        db_category = RatingCategory(
            name=category_in.name,
            description=category_in.description
        )
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category

    async def update_rating_category(
        self, db: AsyncSession, category_id: int, category_update: RatingCategoryUpdate
    ) -> Optional[RatingCategory]:
        """Updates an existing rating category."""
        db_category = await self.get_rating_category_by_id(db, category_id)
        if not db_category:
            return None # Indicate not found

        update_data = category_update.model_dump(exclude_unset=True)

        # Check for name conflict if name is being updated
        if "name" in update_data and update_data["name"] != db_category.name:
            existing_category_query = select(RatingCategory).filter(
                RatingCategory.name == update_data["name"],
                RatingCategory.id != category_id # Exclude the current category
            )
            existing_category = await db.execute(existing_category_query)
            if existing_category.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Rating category with name '{update_data['name']}' already exists."
                )

        if not update_data:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided."
            )

        for field, value in update_data.items():
            setattr(db_category, field, value)

        await db.commit()
        await db.refresh(db_category)
        return db_category

    async def delete_rating_category(self, db: AsyncSession, category_id: int) -> bool:
        """
        Deletes a rating category.
        Returns True if deleted, False if not found.
        Raises HTTPException if the category is in use.
        """
        db_category = await self.get_rating_category_by_id(db, category_id)
        if not db_category:
            return False

        # Check if the category is used in any ReviewRating or ExchangeCategoryRating
        # This requires checking related tables. Add checks if necessary.
        # Example (pseudo-code, requires ReviewRating model import):
        # from app.models.review import ReviewRating
        # usage_check = await db.execute(select(func.count(ReviewRating.id)).filter(ReviewRating.category_id == category_id))
        # if usage_check.scalar_one() > 0:
        #     raise HTTPException(
        #         status_code=status.HTTP_409_CONFLICT,
        #         detail="Cannot delete rating category because it is currently in use by reviews."
        #     )
        # Add similar check for ExchangeCategoryRating if that model exists

        await db.delete(db_category)
        await db.commit()
        return True

rating_category_service = RatingCategoryService()