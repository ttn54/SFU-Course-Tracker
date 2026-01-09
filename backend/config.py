"""
Configuration settings for the SFU Scheduler Backend.
"""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # App Info
    APP_NAME: str = "SFU Scheduler API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./sfu_scheduler.db"
    # For production PostgreSQL, use:
    # DATABASE_URL: str = "postgresql://user:password@localhost:5432/sfu_scheduler"
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # SFU API
    SFU_API_BASE_URL: str = "https://www.sfu.ca/bin/wcm/course-outlines"
    SFU_COURYS_BASE_URL: str = "https://courses.students.sfu.ca"
    
    # Crawler Settings
    CRAWLER_CONCURRENCY_LIMIT: int = 5
    CRAWLER_TIMEOUT: int = 30
    
    # Worker Settings
    SEAT_CHECK_INTERVAL_MINUTES: int = 10
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
