from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # This will be replaced by the postgres URL in production
    DATABASE_URL: str = "sqlite+aiosqlite:///workspace.db"
    
    CORS_ORIGINS: list[str] = ["*"]
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
