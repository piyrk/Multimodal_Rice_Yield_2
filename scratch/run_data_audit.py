"""Programmatic Data Audit Script for ClimateRice-AI.

Audits data/raw/harmonized_rice_multimodal.csv, generates:
- reports/results/data_audit.json
- reports/results/data_audit.csv
And verifies the 504 records, district-year matrix, and target distribution.
"""

import os
import json
import numpy as np
import pandas as pd

raw_path = "data/raw/harmonized_rice_multimodal.csv"
df = pd.read_csv(raw_path)

print(f"Loaded dataset: {raw_path}")
print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

# 1. Basic structural checks
unique_districts = sorted(df["district_name"].unique())
unique_states = sorted(df["state_name"].unique())
unique_years = sorted(df["crop_year"].unique())
n_districts = len(unique_districts)
n_states = len(unique_states)
n_years = len(unique_years)

print(f"Districts: {n_districts}")
print(f"States: {n_states}")
print(f"Years: {n_years} ({min(unique_years)} - {max(unique_years)})")
print(f"Expected 24 * 21 = 504. Actual rows = {len(df)}. Matches exactly: {len(df) == 504}")

# 2. Check duplicates and missing values
n_duplicates = int(df.duplicated(subset=["district_name", "crop_year"]).sum())
total_missing = int(df.isnull().sum().sum())
missing_by_col = {col: int(cnt) for col, cnt in df.isnull().sum().items()}

# 3. District-Year grid completeness matrix
district_year_pivot = df.pivot(index="district_name", columns="crop_year", values="yield_tonnes_per_ha")
grid_complete = (district_year_pivot.notnull().all().all()) and (district_year_pivot.shape == (24, 21))
print(f"District-Year Grid Complete (24 x 21): {grid_complete}")

# 4. Target variable audit
target_col = "yield_tonnes_per_ha"
target_series = df[target_col]
target_stats = {
    "units": "tonnes/hectare (t/ha)",
    "column_name": target_col,
    "count": int(target_series.count()),
    "min": float(target_series.min()),
    "max": float(target_series.max()),
    "mean": float(target_series.mean()),
    "median": float(target_series.median()),
    "std": float(target_series.std()),
    "skewness": float(target_series.skew()),
    "kurtosis": float(target_series.kurtosis()),
    "25%": float(target_series.quantile(0.25)),
    "75%": float(target_series.quantile(0.75)),
}
print(f"Target Yield Summary: min={target_stats['min']:.4f}, max={target_stats['max']:.4f}, mean={target_stats['mean']:.4f}, median={target_stats['median']:.4f}, std={target_stats['std']:.4f}")

# 5. Column-by-column statistics and classification for data_audit.csv
column_audit = []
for col in df.columns:
    s = df[col]
    dtype = str(s.dtype)
    n_null = int(s.isnull().sum())
    unique_cnt = int(s.nunique())
    
    if np.issubdtype(s.dtype, np.number):
        c_min = float(s.min())
        c_max = float(s.max())
        c_mean = float(s.mean())
        c_std = float(s.std())
    else:
        c_min, c_max, c_mean, c_std = None, None, None, None

    column_audit.append({
        "column_name": col,
        "dtype": dtype,
        "missing_count": n_null,
        "unique_values": unique_cnt,
        "min": c_min,
        "max": c_max,
        "mean": c_mean,
        "std": c_std,
    })

df_col_audit = pd.DataFrame(column_audit)
os.makedirs("reports/results", exist_ok=True)
df_col_audit.to_csv("reports/results/data_audit.csv", index=False)
print("Saved reports/results/data_audit.csv")

# 6. Comprehensive JSON audit dictionary
data_audit_json = {
    "dataset_path": raw_path,
    "row_count": len(df),
    "column_count": len(df.columns),
    "spatial_coverage": {
        "num_districts": n_districts,
        "num_states": n_states,
        "states": unique_states,
        "districts": unique_districts,
        "agro_ecological_zones": sorted(df["agro_ecological_zone"].unique().tolist()),
    },
    "temporal_coverage": {
        "start_year": int(min(unique_years)),
        "end_year": int(max(unique_years)),
        "num_years": n_years,
        "years": [int(y) for y in unique_years],
        "temporal_partitions": {
            "train": {"years": [y for y in unique_years if y <= 2014], "count": int((df["crop_year"] <= 2014).sum())},
            "validation": {"years": [y for y in unique_years if 2015 <= y <= 2016], "count": int(((df["crop_year"] >= 2015) & (df["crop_year"] <= 2016)).sum())},
            "test": {"years": [y for y in unique_years if y >= 2017], "count": int((df["crop_year"] >= 2017).sum())},
        }
    },
    "integrity_checks": {
        "expected_records": 24 * 21,
        "actual_records": len(df),
        "grid_completeness_24x21": bool(grid_complete),
        "duplicate_district_year_pairs": n_duplicates,
        "total_missing_values": total_missing,
        "missing_values_by_column": missing_by_col,
    },
    "target_variable": target_stats,
    "district_year_matrix_shape": [24, 21],
    "category_classification_summary": {
        "A_real_observed": ["district_name", "state_name", "latitude", "longitude", "agro_ecological_zone", "crop_year", "season"],
        "B_downloaded_raw": [],
        "C_calculated_derived": ["historical_yield_lag1", "historical_yield_lag2", "historical_yield_3yr_mean", "temp_mean_deg_c", "rainfall_anomaly_pct", "temp_anomaly_deg_c", "ndvi_anomaly"],
        "D_interpolated": [],
        "E_imputed": [],
        "F_calibrated_synthetic_generated": [
            "yield_tonnes_per_ha", "irrigation_ratio", "ndvi_mean", "ndvi_peak", "evi_mean", "ndwi_mean",
            "rainfall_cumulative_mm", "temp_min_deg_c", "temp_max_deg_c", "extreme_heat_days",
            "consecutive_dry_days", "relative_humidity_pct", "solar_radiation_mj_m2", "soil_ph",
            "soil_organic_carbon_g_kg", "soil_nitrogen_g_kg", "soil_clay_pct", "soil_sand_pct",
            "soil_available_water_capacity", "soil_cation_exchange_capacity", "sown_area_ha"
        ],
        "G_hardcoded_placeholder": []
    }
}

def default_serializer(obj):
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return obj.to_dict()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

with open("reports/results/data_audit.json", "w") as f:
    json.dump(data_audit_json, f, indent=2, default=default_serializer)

print("Saved reports/results/data_audit.json")
