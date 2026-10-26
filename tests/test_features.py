"""Unit Tests for Climate Resilience Features."""

import pytest
import numpy as np
import pandas as pd
from src.features.climate_features import (
    compute_rainfall_anomaly_pct,
    compute_temperature_anomaly_deg_c,
    compute_standardized_vegetation_anomaly,
    compute_water_stress_index,
    compute_extreme_heat_index,
)


def test_rainfall_anomaly():
    actual = pd.Series([800.0, 1200.0, 1000.0])
    normal = pd.Series([1000.0, 1000.0, 1000.0])
    anom = compute_rainfall_anomaly_pct(actual, normal)
    assert np.isclose(anom[0], -20.0)
    assert np.isclose(anom[1], 20.0)
    assert np.isclose(anom[2], 0.0)


def test_temperature_anomaly():
    t_actual = pd.Series([32.5, 29.0])
    t_normal = pd.Series([30.0, 30.0])
    anom = compute_temperature_anomaly_deg_c(t_actual, t_normal)
    assert np.isclose(anom[0], 2.5)
    assert np.isclose(anom[1], -1.0)


def test_vegetation_anomaly_bounds():
    ndvi = pd.Series([0.45, 0.75, 0.10])
    mean = pd.Series([0.60, 0.60, 0.60])
    std = pd.Series([0.05, 0.05, 0.05])
    z = compute_standardized_vegetation_anomaly(ndvi, mean, std)
    assert np.all(z >= -4.0)
    assert np.all(z <= 4.0)


def test_water_stress_index_range():
    wsi_high = compute_water_stress_index(rainfall_anom_pct=-35.0, irrigation_ratio=0.2, ndwi=-0.1)
    wsi_low = compute_water_stress_index(rainfall_anom_pct=15.0, irrigation_ratio=0.9, ndwi=0.3)
    assert 0.0 <= wsi_high <= 1.0
    assert 0.0 <= wsi_low <= 1.0
    assert wsi_high > wsi_low


def test_extreme_heat_index():
    assert compute_extreme_heat_index(38.0) > 0
    assert compute_extreme_heat_index(32.0) == 0
