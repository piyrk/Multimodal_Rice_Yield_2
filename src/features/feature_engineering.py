"""Feature Engineering Orchestrator for ClimateRice-AI.

Transforms multi-source raw variables into model-ready multimodal feature spaces,
derives dynamic climate anomalies, and enforces modality definitions.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from .climate_features import (
    compute_rainfall_anomaly_pct,
    compute_temperature_anomaly_deg_c,
    compute_standardized_vegetation_anomaly,
    compute_water_stress_index,
)


class FeatureEngineer:
    """Orchestrates feature calculation and modality mapping."""

    MODALITY_SPEC = {
        "satellite": [
            "ndvi_mean",
            "ndvi_peak",
            "evi_mean",
            "ndwi_mean",
            "ndvi_anomaly",
        ],
        "weather": [
            "rainfall_cumulative_mm",
            "rainfall_anomaly_pct",
            "temp_min_deg_c",
            "temp_max_deg_c",
            "temp_mean_deg_c",
            "temp_anomaly_deg_c",
            "extreme_heat_days",
            "consecutive_dry_days",
            "relative_humidity_pct",
            "solar_radiation_mj_m2",
        ],
        "soil": [
            "soil_ph",
            "soil_organic_carbon_g_kg",
            "soil_nitrogen_g_kg",
            "soil_clay_pct",
            "soil_sand_pct",
            "soil_available_water_capacity",
            "soil_cation_exchange_capacity",
        ],
        "historical": [
            "historical_yield_lag1",
            "historical_yield_lag2",
            "historical_yield_3yr_mean",
            "sown_area_ha",
        ],
    }

    def __init__(self):
        self.all_features = [
            f for group in self.MODALITY_SPEC.values() for f in group
        ]

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Enriches raw DataFrame with derived climate-resilience indicators."""
        df_out = df.copy()

        # Compute water stress indicator if not already present
        if "water_stress_index" not in df_out.columns:
            df_out["water_stress_index"] = [
                compute_water_stress_index(
                    row.get("rainfall_anomaly_pct", 0.0),
                    row.get("irrigation_ratio", 0.70),
                    row.get("ndwi_mean", 0.20),
                )
                for _, row in df_out.iterrows()
            ]

        return df_out

    def get_features_for_modalities(
        self, selected_modalities: List[str]
    ) -> List[str]:
        """Returns the flat list of feature column names for the specified modalities."""
        features: List[str] = []
        for mod in selected_modalities:
            if mod in self.MODALITY_SPEC:
                features.extend(self.MODALITY_SPEC[mod])
            else:
                raise ValueError(f"Unknown modality '{mod}'. Valid: {list(self.MODALITY_SPEC.keys())}")
        return features
