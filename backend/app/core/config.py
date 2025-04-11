# app/core/config.py
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from the project root
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Crypta.Info API"
    PROJECT_VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret_key_change_this") # CHANGE THIS IN PRODUCTION
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

    # API Prefixes (optional, good practice)
    API_V1_STR: str = "/api/v1"

    class Config:
        case_sensitive = True
        env_file = '.env'
        env_file_encoding = 'utf-8'

settings = Settings()