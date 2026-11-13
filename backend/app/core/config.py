from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Centralized application settings validated via Pydantic."""

    # Project metadata
    PROJECT_NAME: str = "Hospital Appointment & Intelligent Waitlist Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_dev_password"
    POSTGRES_DB: str = "hospital_core"
    POSTGRES_HOST: str = "hospital_db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql://postgres:postgres_dev_password@hospital_db:5432/hospital_core"

    # JWT & Security
    SECRET_KEY: str = "dev_secret_key_change_in_production_jwt_hospital_agent_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Internal Agent Security
    AGENT_INTERNAL_SECRET: str = "agent_internal_shared_secret_hospital_ai_2026"

    # Orchestrator & Webhooks
    N8N_WEBHOOK_URL: str = "http://hospital_n8n:5678/webhook"
    OFFER_EXPIRATION_MINUTES: int = 15

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

