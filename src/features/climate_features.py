"""Climate Resilience Feature Engineering Module for ClimateRice-AI.

Implements scientifically grounded meteorological and satellite anomaly indicators
to quantify hydroclimatic stress, heat shocks, and canopy anomalies for rice yield modeling.
References:
- Lobell et al. (2015), PNAS
- Peng et al. (2004), PNAS
- Funk et al. (2015), Scientific Data
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


def compute_rainfall_anomaly_pct(
    rainfall: pd.Series, baseline_mean: pd.Series
) -> pd.Series:
    """Computes the percentage rainfall anomaly relative to climatological normal.

    Formula:
        Anomaly (%) = ((R_actual - R_normal) / R_normal) * 100%

    Agronomic Justification:
        Monsoon variability governs paddy water supply. Negative anomalies (> -20%)
        trigger meteorological and hydrological drought stress.
    """
    safe_baseline = baseline_mean.replace(0, np.nan)
    anomaly = ((rainfall - safe_baseline) / safe_baseline) * 100.0
    return anomaly.fillna(0.0)


def compute_temperature_anomaly_deg_c(
    temperature: pd.Series, baseline_mean: pd.Series
) -> pd.Series:
    """Computes temperature anomaly in degrees Celsius.

    Formula:
        Anomaly (°C) = T_actual - T_normal

    Agronomic Justification:
        Nocturnal minimum temperatures increase respiratory maintenance costs,
        lowering net assimilate accumulation (Peng et al. 2004).
    """
    return temperature - baseline_mean


def compute_standardized_vegetation_anomaly(
    ndvi: pd.Series, district_mean: pd.Series, district_std: pd.Series
) -> pd.Series:
    """Calculates standardized NDVI Z-score anomaly.

    Formula:
        Z_NDVI = (NDVI_t - mu_NDVI) / sigma_NDVI

    Agronomic Justification:
        Differentiates localized crop distress or flood submergence from
        regional climatological averages.
    """
    safe_std = district_std.replace(0, 1.0)
    z_score = (ndvi - district_mean) / safe_std
    return z_score.clip(-4.0, 4.0).fillna(0.0)


def compute_extreme_heat_index(
    tmax: float, heat_threshold: float = 35.0
) -> int:
    """Estimates extreme heat stress frequency.

    Threshold:
        Tmax >= 35°C during anthesis causes pollen desiccation and spikelet sterility.
    """
    if tmax >= heat_threshold:
        return int(max(1, round((tmax - heat_threshold) * 4.0)))
    return 0


def compute_water_stress_index(
    rainfall_anom_pct: float,
    irrigation_ratio: float,
    ndwi: float,
) -> float:
    """Calculates composite water stress index combining rainfall, irrigation, and NDWI.

    Formula:
        WSI = (1 - Irrigation) * max(0, -Rainfall_Anomaly / 100) + max(0, -NDWI)
    Returns:
        Index from 0.0 (no stress) to 1.0 (extreme stress).
    """
    rain_deficit = max(0.0, -rainfall_anom_pct / 100.0)
    irrigation_buffer = 1.0 - irrigation_ratio
    optical_deficit = max(0.0, 0.20 - ndwi)
    wsi = (irrigation_buffer * rain_deficit) + (0.5 * optical_deficit)
    return float(np.clip(wsi, 0.0, 1.0))
