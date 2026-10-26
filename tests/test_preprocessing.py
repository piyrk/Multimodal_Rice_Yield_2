"""Unit Tests for Preprocessing and Leakage Prevention."""

import pytest
import numpy as np
import pandas as pd
from src.preprocessing.pipeline import PreprocessingPipeline


@pytest.fixture
def sample_raw_df():
    data = []
    years = [2010, 2012, 2014, 2015, 2016, 2017, 2018, 2019]
    for yr in years:
        data.append({
            "district_name": "Ludhiana",
            "state_name": "Punjab",
            "crop_year": yr,
            "season": "Kharif",
            "yield_tonnes_per_ha": 4.2 + (yr - 2010) * 0.05,
            # Satellite
            "ndvi_mean": 0.70, "ndvi_peak": 0.80, "evi_mean": 0.55, "ndwi_mean": 0.25, "ndvi_anomaly": 0.1,
            # Weather
            "rainfall_cumulative_mm": 650.0, "rainfall_anomaly_pct": 5.0, "temp_min_deg_c": 23.0,
            "temp_max_deg_c": 34.0, "temp_mean_deg_c": 28.5, "temp_anomaly_deg_c": 0.2,
            "extreme_heat_days": 6, "consecutive_dry_days": 10, "relative_humidity_pct": 70.0, "solar_radiation_mj_m2": 19.0,
            # Soil
            "soil_ph": 7.8, "soil_organic_carbon_g_kg": 4.5, "soil_nitrogen_g_kg": 1.2,
            "soil_clay_pct": 24.0, "soil_sand_pct": 42.0, "soil_available_water_capacity": 0.18, "soil_cation_exchange_capacity": 18.0,
            # Historical
            "historical_yield_lag1": 4.1, "historical_yield_lag2": 4.0, "historical_yield_3yr_mean": 4.05, "sown_area_ha": 120000.0,
        })
    return pd.DataFrame(data)


def test_temporal_split_integrity(sample_raw_df):
    pipeline = PreprocessingPipeline(train_max_year=2014, val_years=[2015, 2016], test_min_year=2017)
    train_df, val_df, test_df = pipeline.temporal_split(sample_raw_df)

    assert train_df["crop_year"].max() <= 2014
    assert set(val_df["crop_year"].unique()) == {2015, 2016}
    assert test_df["crop_year"].min() >= 2017
    # Zero overlap across partitions
    train_years = set(train_df["crop_year"])
    val_years = set(val_df["crop_year"])
    test_years = set(test_df["crop_year"])
    assert len(train_years.intersection(val_years)) == 0
    assert len(train_years.intersection(test_years)) == 0


def test_fit_transform_no_leakage(sample_raw_df):
    pipeline = PreprocessingPipeline(train_max_year=2014, val_years=[2015, 2016], test_min_year=2017)
    train_df, val_df, test_df = pipeline.temporal_split(sample_raw_df)

    train_split = pipeline.fit_transform(train_df)
    assert pipeline.is_fitted
    assert train_split.X_flat.shape[0] == len(train_df)

    # Test transform unseen test data
    test_split = pipeline.transform(test_df)
    assert test_split.X_flat.shape[0] == len(test_df)
    assert not np.isnan(test_split.X_flat).any()


def test_historical_lag_no_target_leakage():
    """Verify zero future target leakage in historical lag features across the 504 raw records."""
    import os
    raw_path = "data/raw/harmonized_rice_multimodal.csv"
    if not os.path.exists(raw_path):
        pytest.skip(f"{raw_path} not found")

    df = pd.read_csv(raw_path)
    assert len(df) == 504

    for district, d_df in df.groupby("district_name"):
        d_df = d_df.sort_values("crop_year").reset_index(drop=True)
        # Check Lag 1 strictly matches prior year t-1
        for i in range(1, len(d_df)):
            expected_lag1 = d_df.loc[i - 1, "yield_tonnes_per_ha"]
            actual_lag1 = d_df.loc[i, "historical_yield_lag1"]
            assert abs(expected_lag1 - actual_lag1) < 1e-3, (
                f"Leakage or mismatch in lag1 for {district} at year {d_df.loc[i, 'crop_year']}"
            )

        # Check Lag 2 strictly matches prior year t-2
        for i in range(2, len(d_df)):
            expected_lag2 = d_df.loc[i - 2, "yield_tonnes_per_ha"]
            actual_lag2 = d_df.loc[i, "historical_yield_lag2"]
            assert abs(expected_lag2 - actual_lag2) < 1e-3, (
                f"Leakage or mismatch in lag2 for {district} at year {d_df.loc[i, 'crop_year']}"
            )

        # Check 3-year mean strictly uses years [i-3, i-2, i-1], never current year i
        for i in range(3, len(d_df)):
            expected_3yr = d_df.loc[i - 3 : i - 1, "yield_tonnes_per_ha"].mean()
            actual_3yr = d_df.loc[i, "historical_yield_3yr_mean"]
            assert abs(expected_3yr - actual_3yr) < 2e-3, (
                f"Leakage or mismatch in 3yr mean for {district} at year {d_df.loc[i, 'crop_year']}"
            )


def test_strict_temporal_split_disjointness():
    """Verify train, validation, and test years on 504 rows are strictly disjoint and ordered."""
    import os
    raw_path = "data/raw/harmonized_rice_multimodal.csv"
    if not os.path.exists(raw_path):
        pytest.skip(f"{raw_path} not found")

    df = pd.read_csv(raw_path)
    pipeline = PreprocessingPipeline(train_max_year=2014, val_years=[2015, 2016], test_min_year=2017)
    train_df, val_df, test_df = pipeline.temporal_split(df)

    assert len(train_df) == 360  # 24 * 15 (2000-2014)
    assert len(val_df) == 48     # 24 * 2 (2015-2016)
    assert len(test_df) == 96    # 24 * 4 (2017-2020)
    assert len(train_df) + len(val_df) + len(test_df) == 504

    train_years = set(train_df["crop_year"].unique())
    val_years = set(val_df["crop_year"].unique())
    test_years = set(test_df["crop_year"].unique())

    assert train_years.isdisjoint(val_years)
    assert train_years.isdisjoint(test_years)
    assert val_years.isdisjoint(test_years)
    assert max(train_years) < min(val_years)
    assert max(val_years) < min(test_years)

