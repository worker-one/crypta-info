# app/static_pages/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.static_pages import schemas, service

router = APIRouter(
    # No prefix here, access directly via /about, /faq etc.
    tags=["Static Pages"]
)

# Define slugs for known pages
KNOWN_SLUGS = ["about", "contacts", "terms", "privacy", "faq"]

@router.get("/{slug}", response_model=schemas.StaticPageRead)
async def get_static_page(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get the content of a static page by its slug (e.g., 'about', 'faq').
    """
    if slug not in KNOWN_SLUGS: # Optional: only allow known slugs
        # pass # Or allow any slug if pages are dynamically created via admin
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")


    db_page = await service.static_page_service.get_page_by_slug(db=db, slug=slug)
    if db_page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page content not found")
    return db_page


# Add POST, PUT, DELETE under /admin for managing static pages