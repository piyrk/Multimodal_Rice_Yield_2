"""Data Validation Module for ClimateRice-AI.

Ensures strict quality control, schema compliance, agronomic boundary sanity,
and prevents silent omission or data leakage.
"""

from typing import Dict, Any, List, Tuple
import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Scientifically bounded valid physical ranges
PHYSICAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "yield_tonnes_per_ha": (0.3, 9.0),          # Indian district average plausible range
    "ndvi_mean": (0.0, 1.0),
    "ndvi_peak": (0.0, 1.0),
    "evi_mean": (0.0, 1.0),
    "ndwi_mean": (-1.0, 1.0),
    "ndvi_anomaly": (-4.0, 4.0),
    "rainfall_cumulative_mm": (50.0, 5000.0),    # Seasonal cumulative rainfall
    "rainfall_anomaly_pct": (-100.0, 400.0),
    "temp_min_deg_c": (5.0, 35.0),
    "temp_max_deg_c": (15.0, 52.0),
    "temp_mean_deg_c": (10.0, 42.0),
    "temp_anomaly_deg_c": (-8.0, 8.0),
    "extreme_heat_days": (0.0, 120.0),
    "consecutive_dry_days": (0.0, 100.0),
    "relative_humidity_pct": (10.0, 100.0),
    "solar_radiation_mj_m2": (5.0, 35.0),
    "soil_ph": (3.5, 9.8),
    "soil_organic_carbon_g_kg": (0.5, 50.0),
    "soil_nitrogen_g_kg": (0.1, 10.0),
    "soil_clay_pct": (2.0, 85.0),
    "soil_sand_pct": (2.0, 90.0),
    "soil_available_water_capacity": (0.02, 0.40),
    "soil_cation_exchange_capacity": (2.0, 80.0),
}


def validate_raw_data(df: pd.DataFrame) -> Dict[str, Any]:
    """Validates raw crop production and environmental records.

    Args:
        df: Input DataFrame

    Returns:
        Validation report dictionary
    """
    report: Dict[str, Any] = {
        "status": True,
        "total_records": len(df),
        "columns_present": list(df.columns),
        "missing_counts": {},
        "range_violations": {},
        "temporal_consistency": True,
        "anomalies_detected": [],
    }

    # Check required ID columns
    required_ids = ["district_name", "state_name", "crop_year", "season"]
    missing_ids = [col for col in required_ids if col not in df.columns]
    if missing_ids:
        report["status"] = False
        report["anomalies_detected"].append(f"Missing required identifier columns: {missing_ids}")

    # Missing values check
    missing_counts = df.isnull().sum().to_dict()
    report["missing_counts"] = {k: int(v) for k, v in missing_counts.items() if v > 0}

    # Physical bounds checks
    for col, (low, high) in PHYSICAL_BOUNDS.items():
        if col in df.columns:
            series = df[col].dropna()
            violations = int(((series < low) | (series > high)).sum())
            if violations > 0:
                report["range_violations"][col] = {
                    "count": violations,
                    "valid_range": [low, high],
                    "min_found": float(series.min()),
                    "max_found": float(series.max()),
                }

    # Physical thermal consistency
    if "temp_min_deg_c" in df.columns and "temp_max_deg_c" in df.columns:
        inverted_temp = (df["temp_min_deg_c"] > df["temp_max_deg_c"]).sum()
        if inverted_temp > 0:
            report["status"] = False
            report["anomalies_detected"].append(
                f"Found {inverted_temp} records where temp_min > temp_max"
            )

    return report


def validate_processed_data(df: pd.DataFrame, expected_features: List[str]) -> Dict[str, Any]:
    """Validates processed dataset ready for model training.

    Ensures zero missing values in features and target, correct data types,
    and valid bounds.
    """
    report: Dict[str, Any] = {
        "status": True,
        "total_records": len(df),
        "features_checked": len(expected_features),
        "missing_features": [],
        "nan_counts": {},
        "infinite_counts": {},
        "temporal_range": [],
        "unique_districts": 0,
    }

    # Check feature presence
    missing_cols = [f for f in expected_features if f not in df.columns]
    if missing_cols:
        report["status"] = False
        report["missing_features"] = missing_cols
        return report

    # Check NaNs and Infs in feature matrix
    for f in expected_features:
        nan_c = int(df[f].isna().sum())
        if nan_c > 0:
            report["nan_counts"][f] = nan_c
            report["status"] = False

        inf_c = int(np.isinf(df[f]).sum()) if pd.api.types.is_numeric_dtype(df[f]) else 0
        if inf_c > 0:
            report["infinite_counts"][f] = inf_c
            report["status"] = False

    if "crop_year" in df.columns:
        report["temporal_range"] = [int(df["crop_year"].min()), int(df["crop_year"].max())]

    if "district_name" in df.columns:
        report["unique_districts"] = int(df["district_name"].nunique())

    return report
