"""Pydantic Request and Response Schemas for ClimateRice-AI Backend API."""

from typing import Dict, Any, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class CropSeasonEnum(str, Enum):
    """Supported agricultural crop seasons in Indian rice agronomy."""
    KHARIF = "Kharif"
    RABI = "Rabi"


class PredictionRequest(BaseModel):
    """Input payload containing district metadata and multimodal environmental features."""
    district_name: str = Field(default="Burdwan", description="District name")
    state_name: Optional[str] = Field(default="West Bengal", description="State name")
    crop_year: Optional[int] = Field(default=2021, description="Crop year")
    season: CropSeasonEnum = Field(
        default=CropSeasonEnum.KHARIF,
        description="Agricultural crop season: 'Kharif' (monsoon) or 'Rabi' (winter/spring)"
    )

    # Satellite Modality
    ndvi_mean: float = Field(default=0.68, ge=0.0, le=1.0, description="Mean NDVI during heading phase")
    ndvi_peak: float = Field(default=0.78, ge=0.0, le=1.0, description="Peak vegetative NDVI")
    evi_mean: float = Field(default=0.52, ge=0.0, le=1.0, description="Mean Enhanced Vegetation Index")
    ndwi_mean: float = Field(default=0.28, ge=-1.0, le=1.0, description="Mean Normalized Difference Water Index")
    ndvi_anomaly: float = Field(default=0.45, ge=-4.0, le=4.0, description="Standardized NDVI anomaly Z-score")

    # Weather Modality
    rainfall_cumulative_mm: float = Field(default=1380.0, ge=50.0, le=5000.0, description="Cumulative rainfall (mm)")
    rainfall_anomaly_pct: float = Field(default=-4.5, ge=-100.0, le=400.0, description="Rainfall anomaly (%)")
    temp_min_deg_c: float = Field(default=24.8, ge=5.0, le=35.0, description="Minimum night temperature (°C)")
    temp_max_deg_c: float = Field(default=33.5, ge=15.0, le=52.0, description="Maximum day temperature (°C)")
    temp_mean_deg_c: float = Field(default=29.15, ge=10.0, le=42.0, description="Mean daily temperature (°C)")
    temp_anomaly_deg_c: float = Field(default=0.35, ge=-8.0, le=8.0, description="Temperature anomaly (°C)")
    extreme_heat_days: int = Field(default=4, ge=0, le=100, description="Days with Tmax >= 35°C")
    consecutive_dry_days: int = Field(default=8, ge=0, le=100, description="Longest consecutive dry spell")
    relative_humidity_pct: float = Field(default=78.0, ge=10.0, le=100.0, description="Mean relative humidity (%)")
    solar_radiation_mj_m2: float = Field(default=17.5, ge=5.0, le=35.0, description="Daily solar radiation (MJ/m²)")

    # Soil Modality
    soil_ph: float = Field(default=6.4, ge=3.5, le=9.5, description="Topsoil pH in H2O")
    soil_organic_carbon_g_kg: float = Field(default=7.8, ge=0.5, le=50.0, description="Soil organic carbon (g/kg)")
    soil_nitrogen_g_kg: float = Field(default=1.7, ge=0.1, le=10.0, description="Total soil nitrogen (g/kg)")
    soil_clay_pct: float = Field(default=36.0, ge=2.0, le=85.0, description="Clay percentage (%)")
    soil_sand_pct: float = Field(default=25.0, ge=2.0, le=90.0, description="Sand percentage (%)")
    soil_available_water_capacity: float = Field(default=0.24, ge=0.02, le=0.40, description="Available water capacity")
    soil_cation_exchange_capacity: float = Field(default=23.5, ge=2.0, le=80.0, description="Cation exchange capacity")

    # Historical Modality
    historical_yield_lag1: float = Field(default=3.25, ge=0.3, le=9.0, description="Lag-1 year yield (t/ha)")
    historical_yield_lag2: float = Field(default=3.10, ge=0.3, le=9.0, description="Lag-2 year yield (t/ha)")
    historical_yield_3yr_mean: float = Field(default=3.18, ge=0.3, le=9.0, description="3-year rolling mean yield (t/ha)")
    sown_area_ha: float = Field(default=140000.0, ge=100.0, le=2000000.0, description="Total sown area (ha)")


class FactorAttribution(BaseModel):
    feature: str
    modality: str
    value: float
    influence: float
    direction: str


class PredictionResponse(BaseModel):
    district_name: str
    predicted_yield_tonnes_per_hectare: float
    epistemic_uncertainty_std: float
    predictive_interval: List[float] = Field(
        ...,
        description="Observationally calibrated predictive interval: mean ± m * std (target 90% split-conformal coverage)",
    )
    calibrated_multiplier_m: Optional[float] = Field(
        default=2.4858,
        description="Split-conformal multiplier m calibrated on authentic observational data",
    )
    calibration_method: Optional[str] = Field(
        default="Normalized Split-Conformal (target 90%)",
        description="Method used to calibrate predictive intervals",
    )
    calibrated_heldout_coverage_pct: Optional[float] = Field(
        default=83.33,
        description="Empirical held-out test coverage after split-conformal recalibration (30/36 cases; 5-split mean 90.56%)",
    )
    empirical_coverage_pct: float = Field(
        default=95.83,
        description="Empirical test set coverage rate of the uncalibrated interval on the benchmark (N=96, 2017-2020)",
    )
    observational_coverage_pct: Optional[float] = Field(
        default=44.44,
        description="Uncalibrated baseline coverage rate on raw observational DES APY test data with m=1.05 (16/36 observations)",
    )
    risk_level: str
    modality_attention_weights: Dict[str, float]
    top_positive_factors: List[FactorAttribution]
    top_negative_factors: List[FactorAttribution]
    model_version: str


class HealthResponse(BaseModel):
    status: str
    version: str
    device: str
    torch_available: bool
    models_loaded: bool


class DistrictProfileResponse(BaseModel):
    """Multimodal feature profile for a district from the Calibrated Semi-Synthetic Agricultural Benchmark."""
    district_name: str
    state_name: str
    crop_year: int
    season: str
    data_source: str
    provenance_category: str = "Category F (Calibrated Semi-Synthetic)"
    is_observational: bool = False
    provenance_details: str
    available_years: List[int]
    latitude: float
    longitude: float
    agro_ecological_zone: str
    irrigation_ratio: float

    # Satellite Modality (5)
    ndvi_mean: float
    ndvi_peak: float
    evi_mean: float
    ndwi_mean: float
    ndvi_anomaly: float

    # Weather Modality (10)
    rainfall_cumulative_mm: float
    rainfall_anomaly_pct: float
    temp_min_deg_c: float
    temp_max_deg_c: float
    temp_mean_deg_c: float
    temp_anomaly_deg_c: float
    extreme_heat_days: int
    consecutive_dry_days: int
    relative_humidity_pct: float
    solar_radiation_mj_m2: float

    # Soil Modality (7)
    soil_ph: float
    soil_organic_carbon_g_kg: float
    soil_nitrogen_g_kg: float
    soil_clay_pct: float
    soil_sand_pct: float
    soil_available_water_capacity: float
    soil_cation_exchange_capacity: float

    # Historical Modality (4)
    historical_yield_lag1: float
    historical_yield_lag2: float
    historical_yield_3yr_mean: float
    sown_area_ha: float

