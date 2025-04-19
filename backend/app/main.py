# app/main.py
from fastapi import FastAPI
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.auth.router import router as auth_router
from app.exchanges.router import router as exchanges_router
from app.rating_categories.router import router as rating_categories_router
from app.reviews.router import router as reviews_router
from app.news.router import router as news_router
from app.static_pages.router import router as static_pages_router
from app.admin.router import router as admin_router

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" # Customize OpenAPI path
)

# --- Middleware ---
# Set up CORS (Cross-Origin Resource Sharing)
origins = [
    "*"
    # Add other allowed origins if needed
]



app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# --- Routers ---
# Include modular routers
api_router_v1 = APIRouter() # Create a router for versioning

api_router_v1.include_router(auth_router)
api_router_v1.include_router(exchanges_router)
api_router_v1.include_router(reviews_router)
api_router_v1.include_router(news_router)
api_router_v1.include_router(admin_router) # Include admin routes under v1 prefix
api_router_v1.include_router(rating_categories_router)
api_router_v1.include_router(static_pages_router) # Static pages router

app.include_router(api_router_v1, prefix=settings.API_V1_STR)

# Include static pages router at the root level AFTER the API router
# This ensures /api/v1/... routes are matched first
app.include_router(static_pages_router)

# --- Utils ---
def generate_openapi_spec(output: str):
    """
    Generate OpenAPI documentation and save it to a file.
    """
    # This function would generate the OpenAPI spec
    # and save it to the specified output file
    dict_object = app.openapi()
    
    # Save as a json file
    with open(output, "w") as f:
        import json
        json.dump(dict_object, f, indent=4)
    print(f"OpenAPI spec generated and saved to {output}")


# --- Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root():
    """
    Root endpoint providing basic API information.
    """
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} API",
        "version": settings.PROJECT_VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
        }
