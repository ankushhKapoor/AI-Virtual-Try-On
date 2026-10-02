from pathlib import Path
from urllib.parse import quote_plus
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

_root_env = Path(__file__).resolve().parents[3] / ".env"
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)
load_dotenv()


class Settings(BaseSettings):
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_NAME: str = "ai_virtual_try_on"

    AMAZON_ACCESS_TOKEN: str = ""
    AMAZON_PARTNER_TAG: str = ""
    AMAZON_MARKETPLACE: str = "www.amazon.in"

    JWT_SECRET_KEY: str = "vesta_super_secret_jwt_key_2026_default"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    OXYLABS_USERNAME: str = ""
    OXYLABS_PASSWORD: str = ""

    @property
    def DATABASE_URL(self) -> str:
        password = quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ""
        return (
            f"mysql+pymysql://{self.DB_USER}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )
    
    class Config:
        env_file = str(_root_env) if _root_env.exists() else ".env"
        extra = "ignore"


settings = Settings()