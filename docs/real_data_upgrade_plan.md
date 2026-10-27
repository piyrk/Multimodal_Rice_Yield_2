# ClimateRice-AI: Real-Data Upgrade Implementation Plan

**Project:** ClimateRice-AI  
**Document:** `docs/real_data_upgrade_plan.md`  
**Target:** Clean, non-destructive migration path from the current Calibrated Semi-Synthetic Multimodal Agricultural Benchmark to genuine observed datasets.  

---

## 1. Overview & Architectural Upgrade Strategy

The current version of ClimateRice-AI utilizes a **Calibrated Semi-Synthetic Multimodal Agricultural Benchmark** ($N = 504$ observations across 24 districts and 21 crop years). To transition to 100% genuine Earth observation and government records without altering the machine learning models, neural architecture (`ClimateRiceFusionNet`), preprocessing pipeline, or API contracts, a standardized interface is provided in [`src/data/real_data_interface.py`](../src/data/real_data_interface.py).

The upgrade is prioritized in order of feasibility, administrative availability, and signal-to-noise impact:
1. **Priority 1:** Real Rice Yield Observations (Ground Truth Target)
2. **Priority 2:** Real Weather & Agroclimatology Observations (Meteorological Drivers)
3. **Priority 3:** Real Satellite Remote Sensing Observations (Canopy Dynamics)
4. **Priority 4:** Real Soil Digital Pedometrics (Edaphic Foundation)

---

## 2. Priority 1: Real Rice Yield Observations (Ground-Truth Target)

| Attribute | Specification |
|---|---|
| **Dataset Name** | Agricultural Production, Yield, and Area Statistics (APY) |
| **Provider** | Directorate of Economics and Statistics (DES), Ministry of Agriculture and Farmers Welfare, Government of India; and ICRISAT District Level Database (VDSA) |
| **Exact Variables** | `State`, `District`, `Crop` (Rice/Paddy), `Crop_Year` (2000–2020), `Season` (Kharif/Autumn), `Area` (Hectares), `Production` (Metric Tonnes), `Yield` (Tonnes/Hectare) |
| **Temporal Resolution** | Annual (compiled per Kharif crop season, July–November) |
| **Spatial Resolution** | District administrative level (Polygon / Centroid aggregation) |
| **Geographical Coverage** | Pan-India (including all 24 monitored study districts across PB, HR, WB, UP, BR, OD, AP, TG, TN, CG, AS) |
| **Access Method** | Open access via DES Agricultural Statistics Portal (`https://aps.dac.gov.in/`) or ICRISAT VDSA repository (`http://data.icrisat.org/`) |
| **License** | Open Government Data (OGD) License India / Creative Commons Attribution (CC-BY 4.0) |
| **Preprocessing Required** | Standardize district boundary mergers/splits (e.g. Burdwan split into Purba/Paschim Bardhaman in 2017); convert production units (kg/ha $\to$ t/ha); sort chronologically by `(district_name, crop_year)` to compute leakage-free lag features (`historical_yield_lag1`, `historical_yield_lag2`, `historical_yield_3yr_mean`). |
| **Expected Storage** | $\sim 50\text{ MB}$ (tabular CSV format for all Indian districts) |
| **Expected Runtime** | $< 15\text{ seconds}$ for district filtering and lag feature generation |
| **Replacement File / Schema** | Replaces `yield_tonnes_per_ha`, `sown_area_ha`, and historical lag columns in `data/raw/harmonized_rice_multimodal.csv` |
| **Limitations** | Historical reporting delays (1–2 year lag in official government gazette releases); occasional spelling variations in district names across state boundaries. |

---

## 3. Priority 2: Real Weather & Agroclimatology Observations

| Attribute | Specification |
|---|---|
| **Dataset Name** | NASA Prediction of Worldwide Energy Resources (POWER) Daily Gridded Meteorology / IMD High-Resolution Gridded Weather |
| **Provider** | NASA Langley Research Center (NASA POWER) / India Meteorological Department (IMD Pune) |
| **Exact Variables** | `PRECTOTCORR` (Precipitation, mm/day), `T2M_MIN` (Daily Minimum 2m Temperature, °C), `T2M_MAX` (Daily Maximum 2m Temperature, °C), `T2M` (Mean Temperature, °C), `RH2M` (Relative Humidity at 2m, %), `ALLSKY_SFC_SW_DWN` (All Sky Surface Downward Shortwave Solar Radiation, $\text{MJ/m}^2/\text{day}$) |
| **Temporal Resolution** | Daily continuous time-series (2000-01-01 to 2020-12-31) |
| **Spatial Resolution** | 0.5° $\times$ 0.5° latitude/longitude global grid (NASA POWER) or 0.25° $\times$ 0.25° (IMD) |
| **Geographical Coverage** | Global coverage; sampled at the 24 district coordinates |
| **Access Method** | RESTful HTTP API query (`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=...&community=AG&longitude=...&latitude=...&start=20000101&end=20201231&format=JSON`) |
| **License** | Open Data (NASA Open Science / Free Public Domain) |
| **Preprocessing Required** | Query daily records for each district centroid; clip to Kharif monsoon window (June 1 – October 31); compute cumulative rainfall; compute climatological normal baseline (2000–2014) to derive rainfall anomaly (%) and temperature anomaly (°C); count extreme heat days ($T_{\max} \ge 35^\circ\text{C}$); compute longest consecutive dry days ($\text{rain} < 2.5\text{ mm}$). |
| **Expected Storage** | $\sim 180\text{ MB}$ (raw daily JSON/CSV for 24 districts $\times$ 21 years $\times$ 365 days) |
| **Expected Runtime** | $\sim 5\text{ minutes}$ across 24 concurrent API requests |
| **Replacement File / Schema** | Replaces weather columns (`rainfall_cumulative_mm`, `temp_min_deg_c`, `extreme_heat_days`, etc.) in `data/raw/harmonized_rice_multimodal.csv` |
| **Limitations** | NASA POWER spatial resolution ($0.5^\circ \approx 50\text{ km}$) smooths localized convective cloudbursts; API rate limits ($30\text{ req/min}$). |

---

## 4. Priority 3: Real Satellite Remote Sensing Observations

| Attribute | Specification |
|---|---|
| **Dataset Name** | MODIS MOD13Q1 Version 6.1 (250m 16-day Vegetation Indices) and Sentinel-2 MultiSpectral Instrument (MSI) Level-2A |
| **Provider** | NASA Land Processes Distributed Active Archive Center (LP DAAC) / USGS EarthExplorer; European Space Agency (ESA) Copernicus SciHub |
| **Exact Variables** | Surface Reflectance Bands: Red (Band 1, 620–670 nm), Near-Infrared (Band 2, 841–876 nm), Blue (Band 3, 459–479 nm), SWIR-1 (Band 6 / Sentinel B11, 1610 nm); Pixel Reliability QA layers. Derived indices: $\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$, $\text{EVI} = 2.5 \frac{\text{NIR} - \text{Red}}{\text{NIR} + 6\text{Red} - 7.5\text{Blue} + 1}$, $\text{NDWI} = \frac{\text{NIR} - \text{SWIR}}{\text{NIR} + \text{SWIR}}$. |
| **Temporal Resolution** | 16-day composite (MODIS) / 5-day revisit (Sentinel-2) across 2000–2020 |
| **Spatial Resolution** | 250 meters (MOD13Q1) / 10–20 meters (Sentinel-2) |
| **Geographical Coverage** | Monitored district crop masks across India |
| **Access Method** | Google Earth Engine Python API (`ee.ImageCollection("MODIS/061/MOD13Q1")`) or bulk download via NASA EarthData AppEEARS |
| **License** | Open Data (Public Domain / Copernicus Open Access) |
| **Preprocessing Required** | Filter cloud contamination using MODIS Quality Assurance bitmask (Pixel Reliability = 0, good data); apply district cropland boundary mask (e.g. from ESA WorldCover 10m or MODIS Land Cover MCD12Q1); extract mean and maximum heading-stage vegetation values per crop year; calculate standardized 10-year NDVI Z-score anomaly relative to district mean. |
| **Expected Storage** | $\sim 2.5\text{ GB}$ (district zonal statistics tables); or $> 150\text{ GB}$ if downloading raw rasters. |
| **Expected Runtime** | $\sim 15\text{ minutes}$ via Google Earth Engine server-side reducers; $\sim 8\text{ hours}$ if downloading full GeoTIFF tiles locally. |
| **Replacement File / Schema** | Replaces satellite columns (`ndvi_mean`, `ndvi_peak`, `evi_mean`, `ndwi_mean`, `ndvi_anomaly`) in `data/raw/harmonized_rice_multimodal.csv` |
| **Limitations** | Heavy cloud contamination during peak monsoon (July–August) requiring gap-filling / Whittaker smoothing; requires Google Earth Engine authentication credentials (`ee.Authenticate()`). |

---

## 5. Priority 4: Real Soil Digital Pedometrics

| Attribute | Specification |
|---|---|
| **Dataset Name** | ISRIC SoilGrids 2.0 (Global Gridded Soil Information) |
| **Provider** | International Soil Reference and Information Centre (ISRIC), Wageningen, Netherlands |
| **Exact Variables** | `phh2o` (Soil pH in $H_2O$), `soc` (Soil Organic Carbon stock, $\text{dg/kg}$), `nitrogen` (Total Nitrogen, $\text{cg/kg}$), `clay` (Clay fraction, $\text{g/kg}$), `sand` (Sand fraction, $\text{g/kg}$), `wv0010` & `wv1500` (Water retention for Available Water Capacity), `cec` (Cation Exchange Capacity at pH 7, $\text{cmol(+)/kg}$). |
| **Temporal Resolution** | Static pedometric mapping (depth interval: 0–30 cm topsoil root zone) |
| **Spatial Resolution** | 250 meters gridded raster |
| **Geographical Coverage** | Global coverage; India bounding box |
| **Access Method** | ISRIC SoilGrids REST API query (`https://rest.soilgrids.org/soilgrids/v2.0/properties/query?lon=...&lat=...`) or OGC Web Coverage Service (WCS) |
| **License** | Creative Commons Attribution 4.0 International (CC-BY 4.0) |
| **Preprocessing Required** | Query point coordinates or calculate zonal median across district agricultural polygons; unit conversions: divide SOC by 10 to obtain $\text{g/kg}$; divide clay and sand by 10 to obtain percentages; calculate Available Water Capacity ($\text{AWC} = \theta_{\text{FC}} - \theta_{\text{WP}}$). |
| **Expected Storage** | $\sim 10\text{ MB}$ (district aggregated tabular records) |
| **Expected Runtime** | $< 1\text{ minute}$ for 24 district REST API queries |
| **Replacement File / Schema** | Replaces static soil columns (`soil_ph`, `soil_organic_carbon_g_kg`, `soil_nitrogen_g_kg`, `soil_clay_pct`, `soil_sand_pct`, `soil_available_water_capacity`, `soil_cation_exchange_capacity`) |
| **Limitations** | Soil properties are largely static over annual scales; ignores year-to-year synthetic chemical fertilizer additions ($N\text{-}P\text{-}K$) applied by individual farmers. |

---

## 6. End-to-End Migration & Verification Checklist

When transitioning the repository to genuine observations:
1. [ ] Download official DES GoI APY records and place in `data/raw/authentic/des_goi_rice_yield.csv`.
2. [ ] Execute `src/data/real_data_interface.py` to trigger NASA POWER and SoilGrids automated REST queries.
3. [ ] Authenticate Google Earth Engine (`earthengine authenticate`) to extract cloud-masked MODIS/Sentinel indices.
4. [ ] Run `RealDataHarmonizer.harmonize_and_verify()` to generate `data/raw/authentic_harmonized_rice_multimodal.csv`.
5. [ ] Copy authentic CSV to `data/raw/harmonized_rice_multimodal.csv`.
6. [ ] Re-run `python -m pytest tests/` to confirm that the strict temporal splits, 0-leakage lag checks, and model contracts pass with 100% compliance.
7. [ ] Execute `python scripts/train.py` to produce final authentic benchmark weights and evaluation metrics.
