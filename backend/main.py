"""
FastAPI Application Entry Point - Day 3 Version

For now, we only have courses router.
We'll add other routers in later days.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_db_and_tables
from routers import courses, validation 

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for SFU Course Tracker"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup: Create database tables
@app.on_event("startup")
def on_startup():
    logger.info("Starting SFU Scheduler API...")
    create_db_and_tables()
    logger.info("Database tables created")


# Include routers
app.include_router(courses.router, prefix=settings.API_V1_PREFIX)
app.include_router(validation.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "SFU Scheduler API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload for development
    )