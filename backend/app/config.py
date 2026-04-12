from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    nia_api_key: str
    groq_api_key: str
    nia_base_url: str = "https://apigcp.trynia.ai/v2"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    max_claims: int = 5
    request_timeout_seconds: int = 300
    nia_poll_interval_seconds: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings(
        nia_api_key=os.getenv("NIA_API_KEY", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        max_claims=int(os.getenv("MAX_CLAIMS", "5")),
        request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "300")),
        nia_poll_interval_seconds=int(os.getenv("NIA_POLL_INTERVAL_SECONDS", "2")),
    )
