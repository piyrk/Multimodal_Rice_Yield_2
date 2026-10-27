/**
 * ClimateRice-AI API Client
 */

const API_HOST = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_HOST}/api/v1`;

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      error: err.message
    };
  }
}

export async function getLocations() {
  try {
    const res = await fetch(`${BASE_URL}/locations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Locations API unavailable, using reference representative list', err);
    return [
      { district_name: "Ludhiana", state_name: "Punjab", lat: 30.9010, lon: 75.8573, zone: "Trans-Gangetic Plains", base_yield: 4.35, irrigation_ratio: 0.98 },
      { district_name: "Burdwan", state_name: "West Bengal", lat: 23.2324, lon: 87.8615, zone: "Lower Gangetic Plain", base_yield: 3.25, irrigation_ratio: 0.72 },
      { district_name: "Varanasi", state_name: "Uttar Pradesh", lat: 25.3176, lon: 82.9739, zone: "Middle Gangetic Plain", base_yield: 2.65, irrigation_ratio: 0.78 },
      { district_name: "Krishna", state_name: "Andhra Pradesh", lat: 16.5062, lon: 80.6480, zone: "East Coast Plains", base_yield: 3.75, irrigation_ratio: 0.89 },
      { district_name: "East Godavari", state_name: "Andhra Pradesh", lat: 16.9891, lon: 82.2475, zone: "East Coast Plains", base_yield: 3.70, irrigation_ratio: 0.88 },
      { district_name: "Thanjavur", state_name: "Tamil Nadu", lat: 10.7870, lon: 79.1378, zone: "East Coast Plains", base_yield: 3.90, irrigation_ratio: 0.86 },
      { district_name: "Raipur", state_name: "Chhattisgarh", lat: 21.2514, lon: 81.6296, zone: "Eastern Plateau", base_yield: 1.85, irrigation_ratio: 0.38 },
      { district_name: "Kamrup", state_name: "Assam", lat: 26.1158, lon: 91.7086, zone: "Eastern Himalayan", base_yield: 2.15, irrigation_ratio: 0.30 }
    ];
  }
}

export async function getDistrictProfile(districtName, cropYear = null, season = 'Kharif', signal = null) {
  const params = new URLSearchParams();
  if (cropYear) params.append('crop_year', cropYear);
  if (season) params.append('season', season);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${BASE_URL}/profile/${encodeURIComponent(districtName)}${qs}`, { signal });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.detail || `No verified profile available for district '${districtName}' (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

export async function getBenchmarkData() {
  try {
    const res = await fetch(`${BASE_URL}/benchmark`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Benchmark API unavailable, using static benchmark results', err);
    return {
      ablation_experiments: {
        "Exp_A_Weather_Only": { "name": "Weather Only", "mae": 0.8124, "rmse": 0.9421, "r2": 0.4217 },
        "Exp_B_Satellite_Only": { "name": "Satellite Only", "mae": 0.5412, "rmse": 0.6834, "r2": 0.6974 },
        "Exp_C_Soil_Only": { "name": "Soil Only", "mae": 0.6120, "rmse": 0.7241, "r2": 0.6605 },
        "Exp_D_Weather_Soil": { "name": "Weather + Soil", "mae": 0.3368, "rmse": 0.4287, "r2": 0.8809 },
        "Exp_E_Satellite_Weather": { "name": "Satellite + Weather", "mae": 0.3124, "rmse": 0.4012, "r2": 0.8958 },
        "Exp_F_Biophysical_All": { "name": "Satellite + Weather + Soil", "mae": 0.2845, "rmse": 0.3621, "r2": 0.9151 },
        "Exp_G_Full_Multimodal": { "name": "Full-feature XGBoost (+History)", "mae": 0.2014, "rmse": 0.2641, "r2": 0.9548, "fusion_net_mae": 0.2774, "fusion_net_rmse": 0.3217, "fusion_net_r2": 0.9329 }
      },
      metadata: {
        "model_name": "ClimateRice-FusionNet",
        "version": "1.0.0",
        "test_mae": 0.2774,
        "test_rmse": 0.3217,
        "test_r2": 0.9329
      }
    };
  }
}

export async function predictYield(payload) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.detail || `Prediction server returned error ${res.status}`;
    throw new Error(message);
  }
  return await res.json();
}
