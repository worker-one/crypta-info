# app/static_pages/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from app.models import static_page as static_page_models
from app.static_pages import schemas

class StaticPageService:

    async def get_page_by_slug(self, db: AsyncSession, slug: str) -> Optional[static_page_models.StaticPage]:
        result = await db.execute(
            select(static_page_models.StaticPage).filter(static_page_models.StaticPage.slug == slug)
        )
        return result.scalar_one_or_none()

    async def create_page(self, db: AsyncSession, page_in: schemas.StaticPageCreate, user_id: Optional[int]) -> static_page_models.StaticPage:
        existing = await self.get_page_by_slug(db, page_in.slug)
        if existing:
            raise ValueError(f"Page with slug '{page_in.slug}' already exists.")

        db_page = static_page_models.StaticPage(
            **page_in.model_dump(),
            last_updated_by_user_id=user_id
        )
        db.add(db_page)
        await db.commit()
        await db.refresh(db_page)
        return db_page

    async def update_page(self, db: AsyncSession, db_page: static_page_models.StaticPage, page_in: schemas.StaticPageUpdate, user_id: Optional[int]) -> static_page_models.StaticPage:
        update_data = page_in.model_dump(exclude_unset=True)

        if "slug" in update_data and update_data["slug"] != db_page.slug:
            existing = await self.get_page_by_slug(db, update_data["slug"])
            if existing:
                raise ValueError(f"Page with slug '{update_data['slug']}' already exists.")
            db_page.slug = update_data["slug"]

        if "title" in update_data:
            db_page.title = update_data["title"]
        if "content" in update_data:
            db_page.content = update_data["content"]

        db_page.last_updated_by_user_id = user_id
        # updated_at is handled by DB onupdate trigger

        await db.commit()
        await db.refresh(db_page)
        return db_page


static_page_service = StaticPageService()