from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Stock Market Assistant API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database: PostgreSQL (asyncpg)
    DATABASE_URL: str = "sqlite+aiosqlite:///./stock_assistant.db"  # Defaults to local async SQLite for quick local start; can point to PostgreSQL via .env

    # Redis & Background Workers
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # AI / LLM Configuration
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-1.5-pro"

    # Market Data Provider
    MARKET_DATA_PROVIDER: str = "yfinance"  # yfinance, alphavantage, twelvedata, or mock

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
