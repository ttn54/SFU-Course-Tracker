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
    
    # CORS (comma-separated string in .env)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://sfu-course-tracker.vercel.app,https://sfu-course-tracker-git-main-zen-nguyens-projects.vercel.app,https://sfu-course-tracker-3wtnfwqi3-zen-nguyens-projects.vercel.app,https://sfucourseplanner.me,https://www.sfucourseplanner.me,https://api.sfucourseplanner.me"
    
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
