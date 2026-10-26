"""API Endpoints Router for ClimateRice-AI."""

from typing import Dict, Any, List
import logging
from fastapi import APIRouter, HTTPException, Depends
import torch

from backend.app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
    DistrictProfileResponse,
)
from backend.app.services.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


def get_model_service() -> ModelService:
    return ModelService.get_instance()


@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(service: ModelService = Depends(get_model_service)):
    """Liveness probe reporting GPU availability, device type, and model status."""
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        device=device_name,
        torch_available=True,
        models_loaded=service.fusion_model is not None,
    )


@router.post("/predict", response_model=PredictionResponse, tags=["Inference"])
def predict_yield(
    request: PredictionRequest, service: ModelService = Depends(get_model_service)
):
    """Predicts rice yield in tonnes/ha with epistemic uncertainty and dynamic attention."""
    try:
        return service.predict(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prediction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/explain", tags=["Explainability"])
def explain_prediction(
    request: PredictionRequest, service: ModelService = Depends(get_model_service)
):
    """Computes detailed SHAP game-theoretic factor attributions for a given scenario."""
    try:
        res = service.predict(request)
        return {
            "district_name": request.district_name,
            "predicted_yield_tonnes_per_ha": res.predicted_yield_tonnes_per_hectare,
            "predictive_interval": res.predictive_interval,
            "empirical_coverage_pct": res.empirical_coverage_pct,
            "risk_level": res.risk_level,
            "modality_attention_weights": res.modality_attention_weights,
            "top_positive_factors": res.top_positive_factors,
            "top_negative_factors": res.top_negative_factors,
            "interpretability_notice": (
                "Attributions represent local marginal deviations relative to the baseline training distribution. "
                "These quantify associative model influence, not deterministic physical causation."
            ),
        }
    except Exception as e:
        logger.error("Explain prediction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations", tags=["Spatial"])
def list_locations(service: ModelService = Depends(get_model_service)):
    """Returns geographical coordinates, state, and baseline agro-climatic properties for districts."""
    return service.get_locations()


@router.get("/history/{district_name}", tags=["Spatial"])
def get_district_history(
    district_name: str, service: ModelService = Depends(get_model_service)
):
    """Returns historical time-series agricultural, meteorological, and satellite records."""
    history = service.get_district_history(district_name)
    if not history:
        raise HTTPException(status_code=404, detail=f"No historical records found for district: {district_name}")
    return history


@router.get("/profile/{district_name}", response_model=DistrictProfileResponse, tags=["Spatial"])
def get_district_profile(
    district_name: str,
    crop_year: int = None,
    season: str = "Kharif",
    service: ModelService = Depends(get_model_service),
):
    """Returns multimodal feature profile from the calibrated semi-synthetic benchmark for a district, crop season, and year."""
    profile = service.get_district_profile(district_name, crop_year=crop_year, season=season)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"No calibrated benchmark profile found for district '{district_name}' with season='{season}'. Benchmark profiles are available for Kharif season across 24 representative study districts.",
        )
    return profile


@router.get("/benchmark", tags=["Research Benchmark"])
def get_benchmark_results(service: ModelService = Depends(get_model_service)):
    """Returns comprehensive modality ablation matrix (Exp A - Exp G) and statistical significance tests."""
    return service.get_benchmark()


@router.get("/features", tags=["Metadata"])
def get_features_metadata(service: ModelService = Depends(get_model_service)):
    """Returns feature definitions, units, and valid physical agronomic bounds."""
    from src.data.validation import PHYSICAL_BOUNDS
    from src.features.feature_engineering import FeatureEngineer

    fe = FeatureEngineer()
    return {
        "modalities": fe.MODALITY_SPEC,
        "physical_bounds": PHYSICAL_BOUNDS,
    }
