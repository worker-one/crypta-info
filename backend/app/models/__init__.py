# app/models/__init__.py
from .base import Base  # Import Base first
from .common import Country, Language, FiatCurrency, RatingCategory, ReviewTag
from .user import User
from .exchange import (
    Exchange, License, ExchangeSocialLink, ExchangeCategoryRating,
    exchange_languages_table, exchange_availability_table,
    exchange_fiat_support_table, news_item_exchanges_table
)
from .review import (
    Review, ReviewRating, ReviewScreenshot, ReviewUsefulnessVote,
    review_tag_assignments_table
)
from .news import NewsItem
from .static_page import StaticPage

# You can optionally define __all__ if needed
# __all__ = [...]