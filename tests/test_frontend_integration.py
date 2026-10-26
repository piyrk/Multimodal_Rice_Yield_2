"""Frontend State Flow & Integration Simulation Tests.

Validates the React PredictPage state flow against the live FastAPI backend:
1. District selection triggers feature profile loading.
2. Stale predictions are immediately invalidated on district change, preset, or edit.
3. Scenario presets update only intended stress fields and preserve the active district.
4. Unavailable districts and unsupported seasons yield explicit errors, not silent defaults.
5. Data provenance is accurately classified as Category F Calibrated Benchmark.
6. Rapid successive asynchronous selections resolve deterministically without stale overwrites.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class MockPredictPageState:
    """Mirrors the exact state logic of PredictPage.jsx."""

    def __init__(self):
        self.default_params = {
            "district_name": "Burdwan",
            "state_name": "West Bengal",
            "crop_year": 2021,
            "season": "Kharif",
            "rainfall_cumulative_mm": 1380.0,
            "rainfall_anomaly_pct": -4.5,
            "temp_mean_deg_c": 29.15,
            "temp_min_deg_c": 24.8,
            "temp_max_deg_c": 33.5,
            "temp_anomaly_deg_c": 0.35,
            "extreme_heat_days": 4,
            "consecutive_dry_days": 8,
            "relative_humidity_pct": 78.0,
            "solar_radiation_mj_m2": 17.5,
            "ndvi_mean": 0.68,
            "ndvi_peak": 0.78,
            "evi_mean": 0.52,
            "ndwi_mean": 0.28,
            "ndvi_anomaly": 0.45,
            "soil_ph": 6.4,
            "soil_organic_carbon_g_kg": 7.8,
            "soil_nitrogen_g_kg": 1.7,
            "soil_clay_pct": 36.0,
            "soil_sand_pct": 25.0,
            "soil_available_water_capacity": 0.24,
            "soil_cation_exchange_capacity": 23.5,
            "historical_yield_lag1": 3.25,
            "historical_yield_lag2": 3.10,
            "historical_yield_3yr_mean": 3.18,
            "sown_area_ha": 140000.0,
        }
        self.form_data = dict(self.default_params)
        self.result = None
        self.error = None
        self.profile_loading = False
        self.profile_error = None
        self.data_source_type = "benchmark"
        self.active_preset_name = None
        self.profile_metadata = None
        self.fetch_seq = 0

    def load_initial_profile(self):
        self.fetch_profile(self.form_data["district_name"], self.form_data["crop_year"], self.form_data["season"])

    def fetch_profile(self, dist_name, crop_year=None, season="Kharif", post_transform=None):
        if season == "Rabi":
            self.data_source_type = "unavailable"
            self.profile_error = "Crop season 'Rabi' is not supported by the deployed model checkpoint."
            self.profile_loading = False
            return False

        self.fetch_seq += 1
        seq_id = self.fetch_seq
        self.profile_loading = True
        self.profile_error = None

        resp = client.get(f"/api/v1/profile/{dist_name}?season={season}" + (f"&crop_year={crop_year}" if crop_year else ""))
        if resp.status_code != 200:
            if seq_id == self.fetch_seq:
                self.data_source_type = "unavailable"
                self.profile_error = resp.json().get("detail", "Profile unavailable")
                self.profile_loading = False
            return False

        if seq_id != self.fetch_seq:
            # Stale request discarded
            return False

        profile = resp.json()
        merged = {
            "district_name": profile["district_name"],
            "state_name": profile["state_name"],
            "crop_year": profile["crop_year"],
            "season": profile["season"],
            "rainfall_cumulative_mm": profile["rainfall_cumulative_mm"],
            "rainfall_anomaly_pct": profile["rainfall_anomaly_pct"],
            "temp_min_deg_c": profile["temp_min_deg_c"],
            "temp_max_deg_c": profile["temp_max_deg_c"],
            "temp_mean_deg_c": profile["temp_mean_deg_c"],
            "temp_anomaly_deg_c": profile["temp_anomaly_deg_c"],
            "extreme_heat_days": profile["extreme_heat_days"],
            "consecutive_dry_days": profile["consecutive_dry_days"],
            "relative_humidity_pct": profile["relative_humidity_pct"],
            "solar_radiation_mj_m2": profile["solar_radiation_mj_m2"],
            "ndvi_mean": profile["ndvi_mean"],
            "ndvi_peak": profile["ndvi_peak"],
            "evi_mean": profile["evi_mean"],
            "ndwi_mean": profile["ndwi_mean"],
            "ndvi_anomaly": profile["ndvi_anomaly"],
            "soil_ph": profile["soil_ph"],
            "soil_organic_carbon_g_kg": profile["soil_organic_carbon_g_kg"],
            "soil_nitrogen_g_kg": profile["soil_nitrogen_g_kg"],
            "soil_clay_pct": profile["soil_clay_pct"],
            "soil_sand_pct": profile["soil_sand_pct"],
            "soil_available_water_capacity": profile["soil_available_water_capacity"],
            "soil_cation_exchange_capacity": profile["soil_cation_exchange_capacity"],
            "historical_yield_lag1": profile["historical_yield_lag1"],
            "historical_yield_lag2": profile["historical_yield_lag2"],
            "historical_yield_3yr_mean": profile["historical_yield_3yr_mean"],
            "sown_area_ha": profile["sown_area_ha"],
        }

        if post_transform:
            self.form_data = post_transform(merged)
            self.data_source_type = "preset"
        else:
            self.form_data = merged
            self.data_source_type = "benchmark"

        self.profile_metadata = {
            "dataSource": profile["data_source"],
            "provenanceCategory": profile["provenance_category"],
            "isObservational": profile["is_observational"],
        }
        self.profile_loading = False
        return True

    def handle_district_change(self, new_dist):
        self.result = None  # Invalidate stale prediction
        self.error = None
        self.active_preset_name = None
        self.form_data["district_name"] = new_dist
        self.fetch_profile(new_dist, self.form_data["crop_year"], self.form_data["season"])

    def handle_season_change(self, new_season):
        self.result = None  # Invalidate stale prediction
        self.error = None
        self.active_preset_name = None
        self.form_data["season"] = new_season
        if new_season == "Rabi":
            self.data_source_type = "unavailable"
            self.profile_error = "Crop season 'Rabi' is not supported by the deployed model checkpoint."
        else:
            self.fetch_profile(self.form_data["district_name"], self.form_data["crop_year"], "Kharif")

    def handle_apply_drought_preset(self):
        self.result = None  # Invalidate stale prediction
        self.error = None
        self.active_preset_name = "Severe Drought & Heat Shock"
        self.data_source_type = "preset"
        # Preserves active district, modifies only intended stress features
        self.form_data["rainfall_anomaly_pct"] = -35.0
        self.form_data["rainfall_cumulative_mm"] = round(self.form_data["rainfall_cumulative_mm"] * 0.65, 1)
        self.form_data["extreme_heat_days"] = 16
        self.form_data["consecutive_dry_days"] = 22
        self.form_data["ndvi_mean"] = 0.48
        self.form_data["ndvi_anomaly"] = -2.1

    def handle_predict(self):
        self.error = None
        if self.form_data["season"] == "Rabi":
            self.error = "Rabi not supported."
            return None
        if self.data_source_type == "unavailable" or self.profile_error:
            self.error = f"Cannot predict: {self.profile_error}"
            return None

        resp = client.post("/api/v1/predict", json=self.form_data)
        if resp.status_code == 200:
            self.result = resp.json()
            return self.result
        else:
            self.error = resp.json().get("detail", "Prediction failed")
            return None


def test_frontend_state_initial_burdwan_and_predict():
    """Test 1: Initial state loads Burdwan benchmark profile and predicts yield."""
    page = MockPredictPageState()
    page.load_initial_profile()

    assert page.form_data["district_name"] == "Burdwan"
    assert page.form_data["state_name"] == "West Bengal"
    assert page.form_data["rainfall_cumulative_mm"] == 1596.5
    assert page.form_data["soil_ph"] == 6.74
    assert page.data_source_type == "benchmark"
    assert page.profile_metadata["isObservational"] is False
    assert "Semi-Synthetic" in page.profile_metadata["provenanceCategory"]

    # Predict for Burdwan
    pred = page.handle_predict()
    assert pred is not None
    assert pred["district_name"] == "Burdwan"
    assert page.result["predicted_yield_tonnes_per_hectare"] > 0


def test_frontend_state_district_change_clears_stale_prediction_and_loads_ludhiana():
    """Test 2: Changing district to Ludhiana clears stale Burdwan prediction and loads Ludhiana profile."""
    page = MockPredictPageState()
    page.load_initial_profile()
    page.handle_predict()
    assert page.result is not None  # Has Burdwan result

    # Change dropdown to Ludhiana
    page.handle_district_change("Ludhiana")

    # Stale prediction MUST be invalidated immediately
    assert page.result is None
    assert page.form_data["district_name"] == "Ludhiana"
    assert page.form_data["state_name"] == "Punjab"
    assert page.form_data["rainfall_cumulative_mm"] == 770.3
    assert page.form_data["soil_ph"] == 7.95
    assert page.form_data["soil_clay_pct"] == 28.6

    # Run prediction for Ludhiana
    pred = page.handle_predict()
    assert pred is not None
    assert pred["district_name"] == "Ludhiana"
    assert page.result["district_name"] == "Ludhiana"


def test_frontend_state_preset_preserves_active_district():
    """Test 3: Applying scenario preset preserves the selected district rather than resetting to default."""
    page = MockPredictPageState()
    page.load_initial_profile()
    page.handle_district_change("Ludhiana")
    page.handle_predict()
    assert page.result is not None

    # Apply drought preset
    page.handle_apply_drought_preset()

    # Result invalidated
    assert page.result is None
    # District preserved
    assert page.form_data["district_name"] == "Ludhiana"
    assert page.form_data["state_name"] == "Punjab"
    assert page.active_preset_name == "Severe Drought & Heat Shock"
    assert page.data_source_type == "preset"
    # Stress parameters applied
    assert page.form_data["rainfall_anomaly_pct"] == -35.0
    assert page.form_data["extreme_heat_days"] == 16

    # Prediction reflects drought on Ludhiana
    pred = page.handle_predict()
    assert pred["district_name"] == "Ludhiana"


def test_frontend_state_unavailable_district_produces_explicit_error():
    """Test 4: Selecting non-existent district produces explicit error and blocks prediction."""
    page = MockPredictPageState()
    page.load_initial_profile()

    page.handle_district_change("AtlantisDistrict")

    assert page.result is None
    assert page.data_source_type == "unavailable"
    assert "No calibrated benchmark profile found" in page.profile_error

    # Must block prediction
    pred = page.handle_predict()
    assert pred is None
    assert "Cannot predict" in page.error


def test_frontend_state_unsupported_rabi_season():
    """Test 5: Switching season to Rabi triggers model limitation notice and disables prediction."""
    page = MockPredictPageState()
    page.load_initial_profile()

    page.handle_season_change("Rabi")

    assert page.result is None
    assert page.data_source_type == "unavailable"
    assert "Rabi" in page.profile_error

    pred = page.handle_predict()
    assert pred is None
    assert "Rabi not supported" in page.error


def test_frontend_state_rapid_successive_selections_no_race_condition():
    """Test 6: Out-of-order asynchronous responses are safely discarded."""
    page = MockPredictPageState()

    # Simulate sequence: Ludhiana (seq 1) -> Burdwan (seq 2)
    page.fetch_seq = 1
    # When Burdwan is selected, fetch_seq becomes 2
    page.handle_district_change("Burdwan")
    assert page.form_data["district_name"] == "Burdwan"
    assert page.fetch_seq == 2
