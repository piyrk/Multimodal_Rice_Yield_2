"""Reproducible Pipeline to Construct the Genuine Observational Agricultural Dataset.

Integrates:
1. Official DES GoI Agricultural Statistics (Area, Production, Yield)
2. NASA POWER Daily Gridded Meteorology (Precipitation, Temperature, Solar Radiation, Humidity)
3. NBSS&LUP / ISRIC SoilGrids Regional Pedometric Profiles
4. Strict Leakage-Free Historical Lag Yield Calculations

Data Lineage:
- Target yield: Category A (Real Observed Target from official Indian Government statistics)
- Weather: Category B (Real Downloaded Observations from NASA POWER REST API)
- Historical lags: Category C (Calculated / Derived from real observed historical yields, strictly t-1, t-2, t-3)
- Soil: Category F (Calibrated Regional Pedometrics from NBSS&LUP / SoilGrids AEZ benchmarks)
- Satellite: Documented Modality Gap (Requires authenticated Google Earth Engine accounts or 50+ GB raster archives)
"""

import sys
import os
import json
import logging
from typing import Dict, Any, List
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from src.data.ingestion import REPRESENTATIVE_DISTRICTS

ALIAS_MAP = {
    "BURDWAN": "BARDHAMAN",
    "MIDNAPORE": "MEDINIPUR WEST"
}


def build_observational_dataset(
    apy_csv_path: str = "data/external/des_apy_raw.csv",
    nasa_power_json: str = "data/external/nasa_power_24_districts.json",
    output_dir: str = "data/observational"
) -> pd.DataFrame:
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load official DES APY statistics
    logger.info("Loading official DES APY statistics from %s", apy_csv_path)
    df_apy = pd.read_csv(apy_csv_path)
    df_apy["Crop"] = df_apy["Crop"].str.strip()
    df_apy["Season"] = df_apy["Season"].str.strip()
    df_apy["District_Name"] = df_apy["District_Name"].str.strip().str.upper()
    df_apy["State_Name"] = df_apy["State_Name"].str.strip().str.upper()

    rice_all = df_apy[df_apy["Crop"].str.lower() == "rice"].dropna(subset=["Production", "Area"]).copy()
    rice_all = rice_all[rice_all["Area"] > 0].copy()
    rice_all["yield_tonnes_per_ha"] = rice_all["Production"] / rice_all["Area"]

    # 2. Load NASA POWER daily meteorological observations
    logger.info("Loading NASA POWER observations from %s", nasa_power_json)
    with open(nasa_power_json, "r") as f:
        nasa_data = json.load(f)

    # 3. Process each representative district
    rows: List[Dict[str, Any]] = []

    for d in REPRESENTATIVE_DISTRICTS:
        dist_name = d["district_name"]
        dist_search = ALIAS_MAP.get(dist_name.upper(), dist_name.upper())
        state_search = d["state_name"].upper()

        dist_rice = rice_all[
            (rice_all["District_Name"] == dist_search) &
            (rice_all["State_Name"] == state_search)
        ].sort_values("Crop_Year")

        # Select primary monsoon rice crop:
        # In Punjab, Haryana, UP, Central & South India: reported under 'Kharif'
        # In West Bengal, Assam, and Bihar: reported under traditional Bengali classification 'Winter' (Aman paddy, July-Nov monsoon)
        if "Kharif" in dist_rice["Season"].values:
            dist_monsoon = dist_rice[dist_rice["Season"] == "Kharif"].copy()
        elif "Winter" in dist_rice["Season"].values:
            dist_monsoon = dist_rice[dist_rice["Season"] == "Winter"].copy()
        else:
            dist_monsoon = dist_rice.copy()

        # Remove duplicate years if any, keeping highest sown area
        dist_monsoon = dist_monsoon.sort_values("Area", ascending=False).drop_duplicates(subset=["Crop_Year"]).sort_values("Crop_Year")
        
        # Build complete historical yield lookup for leakage-free lags
        yield_by_year = dict(zip(dist_monsoon["Crop_Year"].astype(int), dist_monsoon["yield_tonnes_per_ha"]))
        area_by_year = dict(zip(dist_monsoon["Crop_Year"].astype(int), dist_monsoon["Area"]))
        
        # Baseline pre-2000 yield for early initialization
        early_yields = [v for y, v in yield_by_year.items() if y < 2000]
        base_yield = np.mean(early_yields) if len(early_yields) > 0 else d["base_yield"]

        # Weather lookup for this district
        dist_weather = nasa_data.get(dist_name, {})
        precip_dict = dist_weather.get("PRECTOTCORR", {})
        tmin_dict = dist_weather.get("T2M_MIN", {})
        tmax_dict = dist_weather.get("T2M_MAX", {})
        tmean_dict = dist_weather.get("T2M", {})
        rh_dict = dist_weather.get("RH2M", {})
        sol_dict = dist_weather.get("ALLSKY_SFC_SW_DWN", {})

        # Compute climatological normals across 2000-2010 for this district
        clim_rainfall = []
        clim_temp = []
        for yr in range(2000, 2011):
            yr_str = str(yr)
            monsoon_p = [v for k, v in precip_dict.items() if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            monsoon_t = [v for k, v in tmean_dict.items() if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            if monsoon_p:
                clim_rainfall.append(sum(monsoon_p))
            if monsoon_t:
                clim_temp.append(np.mean(monsoon_t))
        
        normal_rain = np.mean(clim_rainfall) if clim_rainfall else 1100.0
        normal_temp = np.mean(clim_temp) if clim_temp else 28.5

        # Process each year from 2000 to 2014
        for yr in range(2000, 2015):
            yr_str = str(yr)
            
            # Ground truth observed yield
            if yr not in yield_by_year:
                continue
            y_obs = yield_by_year[yr]
            
            # Agronomic bound sanity check (0.35 to 8.0 t/ha)
            if y_obs < 0.35 or y_obs > 8.0:
                logger.warning("Excluding outlier yield %.2f for %s in %d", y_obs, dist_name, yr)
                continue

            sown_area = float(area_by_year[yr])

            # Strictly leakage-free historical lags
            # Lag 1: observed yield at t-1
            lag1 = yield_by_year.get(yr - 1, base_yield)
            # Lag 2: observed yield at t-2
            lag2 = yield_by_year.get(yr - 2, base_yield)
            # 3-year rolling mean: average of t-3, t-2, t-1
            lags_3yr = [yield_by_year.get(yr - i, base_yield) for i in [1, 2, 3]]
            lag_3yr_mean = float(np.mean(lags_3yr))

            # Daily weather aggregation across Kharif window (June 1 - October 31)
            p_days = [v for k, v in sorted(precip_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            tmin_days = [v for k, v in sorted(tmin_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            tmax_days = [v for k, v in sorted(tmax_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            tmean_days = [v for k, v in sorted(tmean_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            rh_days = [v for k, v in sorted(rh_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]
            sol_days = [v for k, v in sorted(sol_dict.items()) if k.startswith(yr_str) and "0601" <= k[4:] <= "1031"]

            if not p_days or not tmean_days:
                logger.warning("Missing NASA POWER weather for %s in %d", dist_name, yr)
                continue

            cum_rain = float(sum(p_days))
            rain_anom_pct = float(((cum_rain - normal_rain) / normal_rain) * 100.0)
            t_min = float(np.mean(tmin_days))
            t_max = float(np.mean(tmax_days))
            t_mean = float(np.mean(tmean_days))
            t_anom = float(t_mean - normal_temp)
            rh_mean = float(np.mean(rh_days))
            sol_mean = float(np.mean(sol_days))
            heat_days = int(sum(1 for t in tmax_days if t >= 35.0))

            # Longest consecutive dry spell (days < 2.5mm rain)
            max_dry = 0
            cur_dry = 0
            for p in p_days:
                if p < 2.5:
                    cur_dry += 1
                    if cur_dry > max_dry:
                        max_dry = cur_dry
                else:
                    cur_dry = 0

            # Pedometric properties from regional soil priors (SoilGrids / NBSS&LUP AEZ benchmarks)
            zone = d["zone"]
            if "Trans-Gangetic" in zone:
                ph, soc, n_g, clay, sand, awc, cec = 7.9, 5.2, 1.2, 26.0, 38.0, 0.19, 21.0
            elif "Lower Gangetic" in zone:
                ph, soc, n_g, clay, sand, awc, cec = 6.4, 7.8, 1.7, 36.0, 25.0, 0.24, 23.5
            elif "Middle Gangetic" in zone or "Upper Gangetic" in zone:
                ph, soc, n_g, clay, sand, awc, cec = 7.2, 6.1, 1.4, 30.0, 32.0, 0.21, 20.0
            elif "East Coast" in zone or "Southern" in zone:
                ph, soc, n_g, clay, sand, awc, cec = 7.1, 6.5, 1.5, 42.0, 20.0, 0.26, 28.0
            elif "Eastern Plateau" in zone:
                ph, soc, n_g, clay, sand, awc, cec = 5.8, 5.0, 1.1, 28.0, 42.0, 0.16, 16.5
            else:
                ph, soc, n_g, clay, sand, awc, cec = 6.0, 6.8, 1.5, 32.0, 28.0, 0.22, 19.0

            rows.append({
                "district_name": dist_name,
                "state_name": d["state_name"],
                "crop_year": yr,
                "season": "Kharif",
                "latitude": d["lat"],
                "longitude": d["lon"],
                "agro_ecological_zone": zone,
                "irrigation_ratio": d["irrigation_ratio"],
                "yield_tonnes_per_ha": round(y_obs, 4),
                "sown_area_ha": round(sown_area, 1),
                "historical_yield_lag1": round(lag1, 4),
                "historical_yield_lag2": round(lag2, 4),
                "historical_yield_3yr_mean": round(lag_3yr_mean, 4),
                "rainfall_cumulative_mm": round(cum_rain, 2),
                "rainfall_anomaly_pct": round(rain_anom_pct, 2),
                "temp_min_deg_c": round(t_min, 2),
                "temp_max_deg_c": round(t_max, 2),
                "temp_mean_deg_c": round(t_mean, 2),
                "temp_anomaly_deg_c": round(t_anom, 2),
                "extreme_heat_days": heat_days,
                "consecutive_dry_days": max_dry,
                "relative_humidity_pct": round(rh_mean, 2),
                "solar_radiation_mj_m2": round(sol_mean, 2),
                "soil_ph": ph,
                "soil_organic_carbon_g_kg": soc,
                "soil_nitrogen_g_kg": n_g,
                "soil_clay_pct": clay,
                "soil_sand_pct": sand,
                "soil_available_water_capacity": awc,
                "soil_cation_exchange_capacity": cec,
            })

    df_obs = pd.DataFrame(rows)
    out_csv = os.path.join(output_dir, "observational_kharif_rice.csv")
    df_obs.to_csv(out_csv, index=False)
    
    logger.info("Successfully built Genuine Observational Dataset: %d records across %d districts", len(df_obs), df_obs["district_name"].nunique())
    logger.info("Temporal span: %d to %d", df_obs["crop_year"].min(), df_obs["crop_year"].max())
    logger.info("Target yield summary (tonnes/ha): Mean=%.2f, Std=%.2f, Min=%.2f, Max=%.2f",
                df_obs["yield_tonnes_per_ha"].mean(), df_obs["yield_tonnes_per_ha"].std(),
                df_obs["yield_tonnes_per_ha"].min(), df_obs["yield_tonnes_per_ha"].max())
    logger.info("Saved to %s", out_csv)
    return df_obs


if __name__ == "__main__":
    build_observational_dataset()
