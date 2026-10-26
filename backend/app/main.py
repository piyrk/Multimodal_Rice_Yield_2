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

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
