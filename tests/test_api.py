"""Integration Tests for FastAPI Backend Endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "device" in data


def test_locations_endpoint():
    response = client.get("/api/v1/locations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "district_name" in data[0]
    assert "lat" in data[0]
    assert "lon" in data[0]


def test_benchmark_endpoint():
    response = client.get("/api/v1/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "ablation_experiments" in data


def test_prediction_endpoint_valid():
    payload = {
        "district_name": "Ludhiana",
        "state_name": "Punjab",
        "crop_year": 2021,
        "season": "Kharif",
        "ndvi_mean": 0.72,
        "ndvi_peak": 0.82,
        "evi_mean": 0.58,
        "ndwi_mean": 0.22,
        "ndvi_anomaly": 0.3,
        "rainfall_cumulative_mm": 680.0,
        "rainfall_anomaly_pct": -5.0,
        "temp_min_deg_c": 23.5,
        "temp_max_deg_c": 34.5,
        "temp_mean_deg_c": 29.0,
        "temp_anomaly_deg_c": 0.2,
        "extreme_heat_days": 8,
        "consecutive_dry_days": 12,
        "relative_humidity_pct": 68.0,
        "solar_radiation_mj_m2": 19.5,
        "soil_ph": 7.8,
        "soil_organic_carbon_g_kg": 4.8,
        "soil_nitrogen_g_kg": 1.2,
        "soil_clay_pct": 24.0,
        "soil_sand_pct": 42.0,
        "soil_available_water_capacity": 0.18,
        "soil_cation_exchange_capacity": 18.5,
        "historical_yield_lag1": 4.3,
        "historical_yield_lag2": 4.2,
        "historical_yield_3yr_mean": 4.25,
        "sown_area_ha": 150000.0,
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "predicted_yield_tonnes_per_hectare" in res
    assert "epistemic_uncertainty_std" in res
    assert "risk_level" in res
    assert "modality_attention_weights" in res
    assert res["predicted_yield_tonnes_per_hectare"] > 0


def test_prediction_endpoint_validation_error():
    # Out of physical bound: NDVI cannot be 2.5 (must be <= 1.0)
    invalid_payload = {
        "district_name": "Ludhiana",
        "ndvi_mean": 2.5,  # Violates ge=0.0, le=1.0
    }
    response = client.post("/api/v1/predict", json=invalid_payload)
    assert response.status_code == 422  # Pydantic validation error


def test_prediction_endpoint_unsupported_season_rabi():
    # Season Rabi is rejected with 422 because current model is Kharif-only
    payload = {
        "district_name": "East Godavari",
        "season": "Rabi",
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "Unsupported crop season 'Rabi'" in str(data)


def test_prediction_endpoint_invalid_season_value():
    # Unknown season is rejected by schema enum validation
    payload = {
        "district_name": "Burdwan",
        "season": "Zaid_Monsoon_Custom",
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_repeated_click_prediction_reproducibility():
    """Verify that multiple consecutive predictions with the exact same inputs are 100% deterministic."""
    payload = {
        "district_name": "Ludhiana",
        "state_name": "Punjab",
        "crop_year": 2021,
        "season": "Kharif",
        "ndvi_mean": 0.72,
        "ndvi_peak": 0.82,
        "evi_mean": 0.58,
        "ndwi_mean": 0.22,
        "ndvi_anomaly": 0.3,
        "rainfall_cumulative_mm": 680.0,
        "rainfall_anomaly_pct": -5.0,
        "temp_min_deg_c": 23.5,
        "temp_max_deg_c": 34.5,
        "temp_mean_deg_c": 29.0,
        "temp_anomaly_deg_c": 0.2,
        "extreme_heat_days": 8,
        "consecutive_dry_days": 12,
        "relative_humidity_pct": 68.0,
        "solar_radiation_mj_m2": 19.5,
        "soil_ph": 7.8,
        "soil_organic_carbon_g_kg": 4.8,
        "soil_nitrogen_g_kg": 1.2,
        "soil_clay_pct": 24.0,
        "soil_sand_pct": 42.0,
        "soil_available_water_capacity": 0.18,
        "soil_cation_exchange_capacity": 18.5,
        "historical_yield_lag1": 4.3,
        "historical_yield_lag2": 4.2,
        "historical_yield_3yr_mean": 4.25,
        "sown_area_ha": 150000.0,
    }
    res1 = client.post("/api/v1/predict", json=payload).json()
    res2 = client.post("/api/v1/predict", json=payload).json()
    res3 = client.post("/api/v1/predict", json=payload).json()

    assert res1["predicted_yield_tonnes_per_hectare"] == res2["predicted_yield_tonnes_per_hectare"] == res3["predicted_yield_tonnes_per_hectare"]
    assert res1["epistemic_uncertainty_std"] == res2["epistemic_uncertainty_std"] == res3["epistemic_uncertainty_std"]
    assert res1["predictive_interval"] == res2["predictive_interval"] == res3["predictive_interval"]
    assert res1["modality_attention_weights"] == res2["modality_attention_weights"] == res3["modality_attention_weights"]


def test_district_profile_ludhiana():
    """Verify calibrated benchmark multimodal profile for Ludhiana (Punjab)."""
    response = client.get("/api/v1/profile/Ludhiana")
    assert response.status_code == 200
    data = response.json()
    assert data["district_name"] == "Ludhiana"
    assert data["state_name"] == "Punjab"
    assert data["season"] == "Kharif"
    assert data["is_observational"] is False
    assert "Semi-Synthetic" in data["provenance_category"]
    assert "Benchmark" in data["data_source"]
    assert data["soil_ph"] == 7.95
    assert data["rainfall_cumulative_mm"] == 770.3
    assert data["soil_clay_pct"] == 28.6
    assert "available_years" in data
    assert 2020 in data["available_years"]


def test_district_profile_burdwan():
    """Verify calibrated benchmark multimodal profile for Burdwan (West Bengal) has distinct values from Ludhiana."""
    response = client.get("/api/v1/profile/Burdwan")
    assert response.status_code == 200
    data = response.json()
    assert data["district_name"] == "Burdwan"
    assert data["state_name"] == "West Bengal"
    assert data["season"] == "Kharif"
    assert data["is_observational"] is False
    assert data["soil_ph"] == 6.74
    assert data["rainfall_cumulative_mm"] == 1596.5
    assert data["soil_clay_pct"] == 33.4

    # Ensure Burdwan and Ludhiana are distinctly different
    ludhiana_res = client.get("/api/v1/profile/Ludhiana").json()
    assert data["rainfall_cumulative_mm"] != ludhiana_res["rainfall_cumulative_mm"]
    assert data["soil_ph"] != ludhiana_res["soil_ph"]
    assert data["soil_clay_pct"] != ludhiana_res["soil_clay_pct"]


def test_district_profile_not_found():
    """Verify 404 response for unknown district without silently fabricating fake values."""
    response = client.get("/api/v1/profile/AtlantisDistrict")
    assert response.status_code == 404
    assert "No calibrated benchmark profile found" in response.json()["detail"]


def test_district_profile_unsupported_rabi():
    """Verify 404 response when querying Rabi season for profile."""
    response = client.get("/api/v1/profile/Ludhiana?season=Rabi")
    assert response.status_code == 404
    assert "season='Rabi'" in response.json()["detail"]


def test_end_to_end_profile_to_prediction_pipeline():
    """Test full pipeline: load profile -> send to /predict -> verify matching result district and prediction."""
    # District 1: Ludhiana
    prof_ludhiana = client.get("/api/v1/profile/Ludhiana").json()
    pred_ludhiana = client.post("/api/v1/predict", json=prof_ludhiana)
    assert pred_ludhiana.status_code == 200
    res_ludhiana = pred_ludhiana.json()
    assert res_ludhiana["district_name"] == "Ludhiana"
    assert res_ludhiana["predicted_yield_tonnes_per_hectare"] > 0

    # District 2: Burdwan
    prof_burdwan = client.get("/api/v1/profile/Burdwan").json()
    pred_burdwan = client.post("/api/v1/predict", json=prof_burdwan)
    assert pred_burdwan.status_code == 200
    res_burdwan = pred_burdwan.json()
    assert res_burdwan["district_name"] == "Burdwan"
    assert res_burdwan["predicted_yield_tonnes_per_hectare"] > 0

    # Results must reflect their respective district profiles
    assert res_ludhiana["district_name"] != res_burdwan["district_name"]



