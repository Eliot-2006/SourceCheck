import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .schemas import SourceCheckRequest, SourceCheckResponse
from .sourcecheck import SourceCheckService

app = FastAPI(title="SourceCheck API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/check", response_model=SourceCheckResponse)
async def source_check(request: SourceCheckRequest) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        service = SourceCheckService(client, settings)
        return await service.check(request)
