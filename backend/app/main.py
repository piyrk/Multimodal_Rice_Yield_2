"""FastAPI Application Server for ClimateRice-AI."""

from typing import Dict, Any
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.api.routes import router as api_router
from backend.app.services.model_service import ModelService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes models on startup."""
    logger.info("Initializing ClimateRice-AI Model Services...")
    service = ModelService.get_instance()
    service.load_artifacts()
    yield
    logger.info("Shutting down ClimateRice-AI API server...")


app = FastAPI(
    title="ClimateRice-AI API",
    description=(
        "Research & Production REST API for Climate-Aware Multimodal Deep Learning "
        "for Rice Yield Prediction Using Satellite, Weather, and Soil Data."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: only the deployed frontend (and local dev) may call this API from a
# browser. The API holds no cookies or sessions, so credentials stay off.
# (Hardened 2026-11-23: previously allow_origins=["*"] with credentials on,
# which reflected ANY origin — verified live with a foreign Origin header.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-gilt-chi-35.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# Request-size guard: prediction payloads are a few KB. Oversized bodies are
# rejected before they reach the model (a 3 MB body was accepted live).
MAX_BODY_BYTES = 1_000_000


@app.middleware("http")
async def limit_body_size(request, call_next):
    if request.method == "POST":
        length = request.headers.get("content-length")
        if length is not None and int(length) > MAX_BODY_BYTES:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (limit 1 MB)."},
            )
    return await call_next(request)

# Include API Router
app.include_router(api_router)


@app.get("/", tags=["System"])
def root():
    return {
        "title": "ClimateRice-AI Backend API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/v1/health",
        "status": "operational",
    }
