import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
# from fastapi.responses import PlainTextResponse # Uncomment if using custom 404 handler

# Define the path to the frontend directory relative to this script
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

app = FastAPI()

# Route for the root path "/" to serve index.html
@app.get("/")
async def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")

# Route to serve specific HTML pages like /faq, /about, etc.
@app.get("/{page_slug}")
async def serve_page(page_slug: str):
    # Prevent directory traversal attacks and ignore requests with extensions
    page_slug = page_slug.replace('.html', '')  # Remove .html if present
    if ".." in page_slug or page_slug.startswith("/") or "." in page_slug:
         # Let StaticFiles handle requests with extensions (like .css, .js)
         # or raise 404 if it's not found by StaticFiles either.
         # We explicitly raise 404 here for disallowed patterns.
        raise HTTPException(status_code=404, detail="Not Found")

    page_path = os.path.join(FRONTEND_DIR, f"{page_slug}.html")
    if os.path.exists(page_path):
        return FileResponse(page_path)
    # If the HTML file doesn't exist, raise 404. StaticFiles below handles assets.
    raise HTTPException(status_code=404, detail=f"Resource not found")


# Mount the entire frontend directory for static assets (CSS, JS, images)
# This should be mounted *last* so specific routes above are checked first.
# The path "/" means that files in FRONTEND_DIR are accessible directly from the root URL.
# e.g., request to /css/base.css will look for FRONTEND_DIR/css/base.css
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="static") # html=False prevents StaticFiles serving index.html for directories

# Optional: Add a custom 404 handler if you want a specific HTML page for 404s
# @app.exception_handler(StarletteHTTPException)
# async def custom_404_handler(request, exc):
#     if exc.status_code == 404:
#         not_found_path = os.path.join(FRONTEND_DIR, "404.html") # Create this file if needed
#         if os.path.exists(not_found_path):
#             return FileResponse(not_found_path, status_code=404)
#     # Default handling for other errors or if 404.html doesn't exist
#     # You might need to import PlainTextResponse for this default
#     from fastapi.responses import PlainTextResponse
#     return PlainTextResponse(str(exc.detail), status_code=exc.status_code)


if __name__ == "__main__":
    import uvicorn
    # Run the server; host="0.0.0.0" makes it accessible on the network
    # Use port 8080 to avoid conflict with the default API port 8000
    print(f"Serving frontend from: {FRONTEND_DIR}")
    print("Access the application at http://localhost:8080")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True) # Added reload=True for development
