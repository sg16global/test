from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SG16 AI - Most Powerful AI Engine"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    DATABASE_URL: str
    GROQ_API_KEY: str
    
    # Optional
    OPENAI_API_KEY: str | None = None
    STRIPE_SECRET_KEY: str | None = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
