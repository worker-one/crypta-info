# app/books/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc, or_, and_
from sqlalchemy.orm import selectinload, joinedload # For eager loading
from typing import List, Optional, Tuple
from decimal import Decimal

from app.models import books as book_models
from app.models import item as item_models # For Item base query if needed
from app.books import schemas
from app.schemas.common import PaginationParams
import logging

logger = logging.getLogger(__name__)

class BookService:

    async def get_book_by_slug(self, db: AsyncSession, slug: str) -> Optional[book_models.Book]:
        """Fetches a single book by its slug, including related topics."""
        query = select(book_models.Book).options(
            selectinload(book_models.Book.topics)
            # Add other relationships to preload if needed, e.g., reviews
            # selectinload(book_models.Book.reviews).selectinload(review_models.Review.user)
        ).filter(book_models.Book.slug == slug)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_book_by_id(self, db: AsyncSession, book_id: int) -> Optional[book_models.Book]:
        """Fetches a single book by its ID, including related topics."""
        query = select(book_models.Book).options(
            selectinload(book_models.Book.topics)
            # Add other relationships to preload if needed
        ).filter(book_models.Book.id == book_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_book_by_name(self, db: AsyncSession, name: str) -> Optional[book_models.Book]:
        """Fetches a single book by its name (title)."""
        # Note: Item.name is used for Book title
        result = await db.execute(select(book_models.Book).filter(book_models.Book.name == name))
        return result.scalar_one_or_none()

    async def list_books(
        self,
        db: AsyncSession,
        filters: schemas.BookFilterParams,
        sort: schemas.BookSortBy,
        pagination: PaginationParams,
    ) -> Tuple[List[book_models.Book], int]:
        """Lists books with filtering, sorting, and pagination."""

        query = select(book_models.Book).options(
            # Eager load only necessary fields for list view if needed
            # selectinload(book_models.Book.topics) # Maybe too heavy for list view
        )

        # --- Filtering ---
        filter_conditions = []
        if filters.name:
            # Note: Item.name is used for Book title
            filter_conditions.append(book_models.Book.name.ilike(f"%{filters.name}%"))
        if filters.min_year is not None:
            filter_conditions.append(book_models.Book.year >= filters.min_year)
        if filters.max_year is not None:
            filter_conditions.append(book_models.Book.year <= filters.max_year)

        # Review count filtering (inherited from Item)
        if filters.min_total_review_count is not None:
            filter_conditions.append(book_models.Book.total_review_count >= filters.min_total_review_count)
        if filters.max_total_review_count is not None:
            filter_conditions.append(book_models.Book.total_review_count <= filters.max_total_review_count)

        # Filtering by M2M relationship (topics)
        if filters.topic_id:
            query = query.join(book_models.book_topics_table).filter(book_models.book_topics_table.c.topic_id == filters.topic_id)
            # No need to add to filter_conditions, join handles it. Ensure distinct below.

        if filter_conditions:
             query = query.where(and_(*filter_conditions))

        # Use distinct if joins were added (like for topic_id)
        if filters.topic_id:
            query = query.distinct()

        # --- Count Total ---
        # Create a separate count query applying the same filters
        count_query = select(func.count(book_models.Book.id))
        if filter_conditions:
            count_query = count_query.where(and_(*filter_conditions))
        if filters.topic_id:
            # Apply the join to the count query as well
            count_query = count_query.join(book_models.book_topics_table).filter(book_models.book_topics_table.c.topic_id == filters.topic_id)
            # Count distinct book IDs after the join
            count_query = select(func.count(book_models.Book.id.distinct())).select_from(book_models.Book)
            if filter_conditions:
                 count_query = count_query.where(and_(*filter_conditions))
            count_query = count_query.join(book_models.book_topics_table).filter(book_models.book_topics_table.c.topic_id == filters.topic_id)


        total_result = await db.execute(count_query)
        total = total_result.scalar_one() or 0

        # --- Sorting ---
        # Handle sorting by fields from Book or inherited Item
        sort_column = getattr(book_models.Book, sort.field)
        if sort.direction == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # --- Pagination ---
        query = query.offset(pagination.skip).limit(pagination.limit)

        # --- Execute Query ---
        result = await db.execute(query)
        books = result.scalars().all()

        return books, total

    # --- CRUD (Likely Admin Only) ---
    async def create_book(self, db: AsyncSession, book_in: schemas.BookCreate) -> book_models.Book:
        """Creates a new book."""
        logger.info(f"Creating new book with title: {book_in.name}, slug: {book_in.slug}")

        # Check slug uniqueness (inherited from Item)
        existing_slug = await db.execute(select(item_models.Item).filter(item_models.Item.slug == book_in.slug))
        if existing_slug.scalar_one_or_none():
            logger.warning(f"Book creation failed: slug '{book_in.slug}' already exists")
            raise ValueError(f"Item slug '{book_in.slug}' already exists.")

        # Check name uniqueness (inherited from Item)
        existing_name = await self.get_book_by_name(db, book_in.name)
        if existing_name:
             logger.warning(f"Book creation failed: name '{book_in.name}' already exists for a book")
             raise ValueError(f"Book name '{book_in.name}' already exists.")


        db_book = book_models.Book(**book_in.model_dump(exclude={"topic_ids"}))
        db_book.item_type = item_models.ItemTypeEnum.book # Ensure polymorphic type is set

        # Add M2M relationships for topics
        if book_in.topic_ids:
            logger.info(f"Adding {len(book_in.topic_ids)} topics")
            topics = await db.execute(select(book_models.Topic).filter(book_models.Topic.id.in_(book_in.topic_ids)))
            db_book.topics.extend(topics.scalars().all())

        db.add(db_book)
        await db.commit()
        await db.refresh(db_book, attribute_names=['topics']) # Refresh topics relationship
        logger.info(f"Book '{db_book.name}' created successfully with ID {db_book.id}")
        # Re-fetch full details if needed for the response, including topics
        return await self.get_book_by_slug(db, db_book.slug)


    async def update_book(self, db: AsyncSession, db_book: book_models.Book, book_in: schemas.BookUpdate) -> book_models.Book:
        """Updates an existing book."""
        logger.info(f"Updating book with ID: {db_book.id}, Slug: {db_book.slug}")

        # Check if name is changed and if it conflicts
        if book_in.name and book_in.name != db_book.name:
            existing_name = await self.get_book_by_name(db, book_in.name)
            if existing_name and existing_name.id != db_book.id:
                logger.warning(f"Book update failed for ID {db_book.id}: name '{book_in.name}' already exists")
                raise ValueError(f"Book name '{book_in.name}' already exists.")

        # Check if slug is changed and if it conflicts
        if book_in.slug and book_in.slug != db_book.slug:
             existing_slug = await db.execute(select(item_models.Item).filter(item_models.Item.slug == book_in.slug, item_models.Item.id != db_book.id))
             if existing_slug.scalar_one_or_none():
                 logger.warning(f"Book update failed for ID {db_book.id}: slug '{book_in.slug}' already exists")
                 raise ValueError(f"Item slug '{book_in.slug}' already exists.")

        # Update direct fields from BookBase and BookUpdate
        update_data = book_in.model_dump(exclude={"topic_ids"}, exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_book, key, value)

        # Update M2M relationships for topics
        if book_in.topic_ids is not None:
            logger.info(f"Updating topics for book ID {db_book.id}")
            # Clear existing topics and add new ones
            db_book.topics = []
            if book_in.topic_ids:
                topics = await db.execute(select(book_models.Topic).filter(
                    book_models.Topic.id.in_(book_in.topic_ids)
                ))
                db_book.topics.extend(topics.scalars().all())

        await db.commit()
        await db.refresh(db_book, attribute_names=['topics']) # Refresh topics relationship
        logger.info(f"Book '{db_book.name}' (ID: {db_book.id}) updated successfully.")
        # Re-fetch full details with all relations
        return await self.get_book_by_slug(db, db_book.slug)

    async def delete_book(self, db: AsyncSession, book_id: int) -> bool:
        """Deletes a book by its ID."""
        logger.info(f"Attempting to delete book with ID: {book_id}")
        # Fetch the book first (it inherits from Item, deletion cascades via Item)
        db_book = await db.get(book_models.Book, book_id)
        if db_book:
            await db.delete(db_book) # SQLAlchemy handles cascade delete to Item table
            await db.commit()
            logger.info(f"Book with ID: {book_id} deleted successfully.")
            return True
        logger.warning(f"Delete failed: Book with ID {book_id} not found.")
        return False


book_service = BookService()
