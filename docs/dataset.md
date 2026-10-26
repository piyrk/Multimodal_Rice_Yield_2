# Dataset Documentation: ClimateRice-AI

## 1. Overview and Benchmark Nature

The current dataset evaluated in ClimateRice-AI is explicitly designated as a **Calibrated Semi-Synthetic Multimodal Agricultural Benchmark** ($N = 504$ records across 24 representative Indian districts spanning 21 crop years, 2000–2020). District spatial centroids, agro-ecological classifications, and baseline historical yields are grounded in authentic DES GoI and ICRISAT records. The multi-decadal annual time series were generated via peer-reviewed biophysical equations (Peng et al. 2004, Lobell et al. 2015) coupled to historical Indian drought and heat shock years to bypass offline multi-gigabyte raster storage and NASA EarthData credential limits. 

For full column classification, see [`docs/data_audit.md`](data_audit.md). For the migration roadmap to 100% genuine observations, see [`docs/real_data_upgrade_plan.md`](real_data_upgrade_plan.md).

```
                          DATA LINEAGE ARCHITECTURE
                          
  +--------------------------------------------------------------------------+
  | 1. Agricultural Ground Truth (DES / ICRISAT / Data.gov.in)               |
  |    District-wise Rice Sown Area (ha), Production (tonnes), Yield (t/ha)  |
  +--------------------------------------------------------------------------+
                                       │
  +--------------------------------------------------------------------------+
  | 2. Weather / Agroclimatology (NASA POWER / IMD / CHIRPS)                 |
  |    Precipitation, Tmin, Tmax, Tmean, Solar Rad, Heat Days, Dry Spells    |
  +--------------------------------------------------------------------------+
                                       │
  +--------------------------------------------------------------------------+
  | 3. Satellite Remote Sensing (MODIS MOD13Q1 / Sentinel-2 MSI)             |
  |    NDVI, EVI, NDWI, Canopy Vigor Anomalies                               |
  +--------------------------------------------------------------------------+
                                       │
  +--------------------------------------------------------------------------+
  | 4. Soil Edaphic Constraints (ISRIC SoilGrids 2.0 @ 250m)                 |
  |    pH, Organic Carbon, Nitrogen, Clay %, Sand %, Water Retention, CEC    |
  +--------------------------------------------------------------------------+
                                       ▼
  +--------------------------------------------------------------------------+
  | HARMONIZED MULTIMODAL DATASET: (District, Year, Season)                  |
  +--------------------------------------------------------------------------+
```

---

## 2. Source Identification & Verification Matrix

| Modality | Primary Source | Responsible Organization | Spatial Resolution | Temporal Window | Access License | Citation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Rice Yield (Target)** | Directorate of Economics & Statistics (DES) | Ministry of Agriculture & Farmers Welfare, Govt of India | District-level polygons (~300+ districts) | Seasonal (1997–2020) | Government Open Data License - India (GODL) | DES GoI (2020), data.gov.in |
| **Weather & Climate** | NASA POWER Agroclimatology | NASA Langley Research Center / IMD | $0.5^\circ \times 0.5^\circ$ gridded centroid aggregation | Daily aggregated to seasonal growing window | Public Domain / Open Data | Sparks (2018), NASA POWER v2.0 |
| **Satellite Indices** | MODIS MOD13Q1 / Sentinel-2 | NASA LP DAAC / ESA Copernicus | 250m / 10m spatial pixel composites | 16-day composites aggregated across phenology stages | Open Access (Creative Commons / NASA Data Policy) | Huete et al. (2002); Didan (2015) |
| **Soil Properties** | ISRIC SoilGrids 2.0 | International Soil Reference & Information Centre (ISRIC) | 250m gridded depth layers (0–30 cm) | Baseline static pedometric mapping | CC-BY 4.0 | Hengl et al. (2017) |

---

## 3. Dataset Schema and Variable Specifications

### 3.1 Identification & Spatio-Temporal Metadata
* `district_name` (*string*): Official administrative district name.
* `state_name` (*string*): State or Union Territory of India.
* `crop_year` (*integer*): Crop harvest year (e.g., 2000–2020).
* `season` (*string*): Cultivation season (`Kharif` [monsoon], `Rabi` [winter], `Autumn`, `Summer`).
* `latitude` (*float, degrees*): Centroid latitude coordinate of the district ($8.0^\circ \text{N}$ to $32.0^\circ \text{N}$).
* `longitude` (*float, degrees*): Centroid longitude coordinate of the district ($68.0^\circ \text{E}$ to $96.0^\circ \text{E}$).

### 3.2 Target Variable
* `yield_tonnes_per_ha` (*float, $t/ha$*): Primary regression target computed as:
  $$\text{Yield} = \frac{\text{Production (tonnes)}}{\text{Sown Area (hectares)}}$$
  *Valid physical range in India:* $0.4\text{ to }7.5\text{ tonnes/ha}$ (mean $\approx 2.4\text{ t/ha}$; Punjab high-input intensive paddy reaching $4.0-5.0\text{ t/ha}$; rainfed eastern upland reaching $1.0-1.8\text{ t/ha}$).

### 3.3 Satellite Modality ($\mathcal{M}_{sat}$)
* `ndvi_mean` (*float, dimensionless $[-1, 1]$*): Mean Normalized Difference Vegetation Index during reproductive/heading phase.
* `ndvi_peak` (*float, dimensionless $[-1, 1]$*): Maximum canopy greenness attained during peak vegetative phase.
* `evi_mean` (*float, dimensionless $[-1, 1]$*): Enhanced Vegetation Index correcting for soil background reflectance and atmospheric aerosol scattering.
* `ndwi_mean` (*float, dimensionless $[-1, 1]$*): Normalized Difference Water Index measuring paddy water ponding and canopy water content.
* `ndvi_anomaly` (*float, z-score*): Standardized deviation from district 10-year mean NDVI:
  $$Z = \frac{NDVI - \mu_{dist}}{\sigma_{dist}}$$

### 3.4 Weather & Climate Modality ($\mathcal{M}_{wea}$)
* `rainfall_cumulative_mm` (*float, $mm$*): Total accumulated rainfall during the 120–150 day rice growing season (typically $400\text{ to }2500\text{ mm}$).
* `rainfall_anomaly_pct` (*float, $\%$*): Percentage departure of seasonal rainfall from long-term normal:
  $$\Delta R = \frac{R_{actual} - R_{normal}}{R_{normal}} \times 100\%$$
* `temp_min_deg_c` (*float, $^\circ C$*): Average nocturnal minimum temperature ($16.0\text{ to }28.0^\circ C$).
* `temp_max_deg_c` (*float, $^\circ C$*): Average diurnal maximum temperature ($26.0\text{ to }42.0^\circ C$).
* `temp_mean_deg_c` (*float, $^\circ C$*): Mean daily temperature across the growing window.
* `temp_anomaly_deg_c` (*float, $^\circ C$*): Mean temperature anomaly relative to district baseline.
* `extreme_heat_days` (*integer, days*): Count of days with $T_{max} \ge 35^\circ C$ during flowering (key thermal sterility threshold).
* `consecutive_dry_days` (*integer, days*): Longest continuous span of consecutive dry days ($< 1\text{ mm}$) during vegetative stage.
* `relative_humidity_pct` (*float, $\%$*): Mean relative humidity during panicle initiation and grain filling.
* `solar_radiation_mj_m2` (*float, $MJ/m^2/day$*): Incident daily solar radiation driving photosynthesis.

### 3.5 Soil Modality ($\mathcal{M}_{soil}$)
* `soil_ph` (*float, $-\log[H^+]$*): Topsoil pH (0–30 cm depth). Favorable range: $5.5\text{ to }7.2$.
* `soil_organic_carbon_g_kg` (*float, $g/kg$*): Soil organic carbon concentration.
* `soil_nitrogen_g_kg` (*float, $g/kg$*): Total soil nitrogen content.
* `soil_clay_pct` (*float, $\%$*): Percentage clay fraction (paddy soils prefer $> 25\%$ clay to retard percolation).
* `soil_sand_pct` (*float, $\%$*): Percentage sand fraction.
* `soil_available_water_capacity` (*float, $m^3/m^3$*): Soil volumetric water capacity available for root uptake.
* `soil_cation_exchange_capacity` (*float, $cmol_c/kg$*): Cation retention and exchange capacity.

### 3.6 Historical Agricultural Modality ($\mathcal{M}_{hist}$)
* `historical_yield_lag1` (*float, $t/ha$*): Recorded yield of the immediate prior year in the same district.
* `historical_yield_lag2` (*float, $t/ha$*): Recorded yield 2 years prior in the same district.
* `historical_yield_3yr_mean` (*float, $t/ha$*): Moving average baseline of past 3 years.
* `sown_area_ha` (*float, hectares*): Total land area dedicated to rice cultivation in the district.
* `growing_season_days` (*integer, days*): Length of active phenological cycle (e.g., 135 days).

---

## 4. Quality Control, Cleaning and Validation Rules

1. **Zero / Missing Production Handling:** Records with negative or zero production, or zero sown area, represent reporting omissions and are flagged or filtered.
2. **Outlier Filtering (Agronomic Plausibility):**
   * Yields $< 0.3\text{ tonnes/ha}$ (severe crop failure/reporting error) or $> 9.0\text{ tonnes/ha}$ (biophysically improbable for broad district averages in India) are validated and clipped/dropped.
3. **Temporal Sanity Checks:**
   * Lagged values ($Y_{t-1}, Y_{t-2}$) must strictly reference prior chronological years, never future years, preventing look-ahead leakage.
4. **Physical Bounds Validation:**
   * $NDVI \in [0.05, 0.95]$ for vegetated cropland.
   * Soil pH $\in [3.5, 9.5]$.
   * Relative Humidity $\in [10\%, 100\%]$.
   * Rainfall $\ge 0\text{ mm}$.
