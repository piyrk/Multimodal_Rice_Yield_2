# ClimateRice-AI: Climate-Aware Multimodal Deep Learning for Rice Yield Prediction

[![Python 3.12](https://img.shields.io/badge/Python-3.12.10-blue.svg)](https://www.python.org/)
[![PyTorch 2.6 CUDA](https://img.shields.io/badge/PyTorch-2.6.0%2Bcu124-EE4C2C.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.143-009688.svg)](https://fastapi.tiangolo.com/)
[![React Vite](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: Passed](https://img.shields.io/badge/Tests-39%20Passed-brightgreen.svg)]()
[![Audit: Verified](https://img.shields.io/badge/Research_Audit-YELLOW_Verified-yellow.svg)](docs/research_integrity_audit.md)
[![Observational: 303 Records](https://img.shields.io/badge/Observational_Data-303_Records-emerald.svg)](docs/observational_dataset_report.md)

> **Project 19 — B.Tech CSE Final Year Capstone Project**  
> **Student Team:** Piyush Kumar, Rajesh, Laxmi Pavani, Mullapudi Pravallika  
> **Faculty Mentor / Supervisor:** Dr. E. Raveendra Reddy  
> **Department:** Department of Computer Science and Engineering  
> **Target:** Rice Yield Prediction in Metric Tonnes per Hectare ($t/ha$)  
> **Regional Scope:** Origin in Andhra Pradesh (Krishna / Vijayawada agro-ecological zone) with pan-India benchmark generalization across 24 representative districts  
> **Integrity & Lineage:** [Research Integrity Audit](docs/research_integrity_audit.md) | [Data Lineage Audit](docs/data_audit.md) | [Observational Dataset Report](docs/observational_dataset_report.md) | [Observational Experiments](docs/observational_experiments.md)  

---

## 1. Executive Summary & Problem Formulation

Rice (*Oryza sativa*) is the dietary cornerstone for over 50% of the global population, with India producing over 130 million metric tonnes annually. However, rice cultivation is acutely susceptible to climate change, extreme heatwaves during anthesis, erratic monsoon precipitation, and regional soil nutrient depletion.

Conventional agricultural forecasting approaches predominantly rely either on single-source meteorological weather stations or isolated satellite vegetation indices (e.g. NDVI alone). These single-modality models fail to capture non-linear, cross-domain dependencies between atmospheric water supply, surface canopy reflectance, root-zone soil water retention, and historical agronomic momentum.

**ClimateRice-AI** investigates this challenge through a rigorous dual-track empirical strategy:
1. **Authentic Observational Evaluation Track ($N = 303$ records, 2001–2022):** Ground-truth district crop yields from the Directorate of Economics and Statistics (DES), Ministry of Agriculture & Farmers Welfare, Government of India, paired with NASA POWER agro-meteorology and MODIS MOD13Q1 remote sensing.
2. **Calibrated Semi-Synthetic Modality Benchmark Track ($N = 504$ panel observations, 24 districts $\times$ 21 crop years):** Grounded in authentic administrative centroids and baseline yields, coupled to peer-reviewed biophysical equations (Peng et al. 2004, Lobell et al. 2015) for systematic 7-phase ablation testing.

---

## 2. Research Question and Formal Hypotheses

### 2.1 Central Research Question
> **"Can integrating satellite, weather, soil, and historical agricultural information improve rice-yield prediction, and how does a multimodal deep-learning architecture compare with strong traditional machine-learning baselines?"**

### 2.2 Formal Hypotheses
* **Primary Hypothesis ($H_1$):** Multimodal feature integration combining satellite, weather, soil, and historical agricultural records achieves a statistically significant error reduction ($MAE$, $RMSE$) and higher variance explanation ($R^2$) over single-modality configurations.
* **Null Hypothesis ($H_0$):** Multimodal feature integration provides no statistically meaningful improvement over single-modality models ($p \ge 0.05$).

### 2.3 Experimental Findings

#### 1. Lead Story: Authentic Observational Results ($N = 303$ Ground-Truth Records)
On real-world observational data reflecting authentic agricultural noise:
* **`ClimateRice-FusionNet` (Multimodal):** $R^2 = 0.6803$, $\text{MAE} = 0.3366\text{ t/ha}$, $\text{RMSE} = 0.4711\text{ t/ha}$.
* **Ridge Regression (Linear Baseline):** $R^2 = 0.6720$, $\text{MAE} = 0.3502\text{ t/ha}$, $\text{RMSE} = 0.4771\text{ t/ha}$.
* **XGBoost (Observational Baseline):** $R^2 = 0.5904$, $\text{MAE} = 0.3699\text{ t/ha}$, $\text{RMSE} = 0.5332\text{ t/ha}$.
* **Observational Deep Learning Advantage:** On authentic noisy agricultural statistics, **`ClimateRice-FusionNet` achieves the lowest error and highest variance explanation**, outperforming XGBoost ($R^2 = 0.6803\text{ vs } 0.5904$, $\text{MAE} = 0.3366\text{ vs } 0.3699\text{ t/ha}$) through dynamic cross-modal attention gating.

#### 2. Controlled Modality Benchmark Ablation (calibrated semi-synthetic benchmark, $N = 504$)
* **Multimodal Integration:** **ACCEPTED ($p \ll 0.05$).** Fusing all four modalities reduces test MAE from $0.5427\text{ t/ha}$ (Satellite alone) to $0.2014\text{ t/ha}$ (Full-feature XGBoost) and $0.2774\text{ t/ha}$ (ClimateRice-FusionNet). Paired Student's t-test: $t = -5.5533, p = 2.54 \times 10^{-7} \ll 0.05$.
* **Model Comparison (Tabular ML vs. Deep Learning):** On this structured tabular panel benchmark, **Full-feature XGBoost provides the strongest numerical prediction performance** ($\text{MAE} = 0.2014\text{ t/ha}, R^2 = 0.9548$ (calibrated semi-synthetic benchmark, $N=504$)), outperforming the deep neural network `ClimateRice-FusionNet` ($\text{MAE} = 0.2774\text{ t/ha}, R^2 = 0.9329, p = 0.0019$).
* **Deep Learning Contribution:** `ClimateRice-FusionNet` provides complementary structural advantages: (1) differentiable cross-modal attention that dynamically redistributes modality weights during climate shocks, and (2) MC Dropout predictive intervals via 50-sample Monte Carlo Dropout.
* **Predictive Uncertainty Coverage Discrepancy:** The MC Dropout $\pm 1.96\sigma$ predictive interval achieves **$95.83\%$ empirical coverage on the benchmark test set** (92/96 cases), but covers **$44.44\%$ on the raw observational test set** (16/36 cases), demonstrating that real-world unobserved field variables expand residual variance beyond atmospheric and optical signals.

---

## 3. Project 19 Objectives & Technical Scope

ClimateRice-AI fulfills the complete brief of **Project 19 (AI-Driven Climate-Resilient Agriculture Decision Support System)** through four coordinated technical objectives:

* **Objective 1 — Climate-Aware Yield Prediction:** Deep cross-modal attention network (`ClimateRice-FusionNet`) fusing 26 satellite, meteorological, edaphic, and autoregressive historical features with Monte Carlo Dropout uncertainty estimation.
* **Objective 2 — Precision Water Management Advisory:** Rule-based Alternate Wetting and Drying (AWD) water management scheduling tailored to soil clay texture fraction, rainfall anomaly, and consecutive dry days.
* **Objective 3 — Recommended Rice Cultivar Decision Matrix:** Authoritative cultivar selection matrix sourced directly from ICAR-NRRI and ANGRAU with maturity duration (days), flood/drought/submergence tolerances, and recommended agro-ecological zones.
* **Objective 4 — Weather-Window Pest & Pathogen Forewarning:** Biophysical weather-window disease risk scoring for Rice Blast (*Magnaporthe oryzae*), Brown Planthopper (*Nilaparvata lugens*), and Bacterial Leaf Blight (*Xanthomonas oryzae*) based on nighttime temperature, humidity, and dry/rain spell patterns.

### Technical Boundaries

| In Scope (Implemented Deliverables) | Out of Scope (Documented as Future Work) |
| :--- | :--- |
| Multimodal environmental data alignment | Real-time IoT soil-moisture hardware & physical irrigation relays |
| Strict temporal leakage-free partitioning | Genetic-algorithm crop gene sequencing |
| Climate resilience feature engineering | CNN-based raw leaf image mobile disease classification |
| Controlled 7-phase modality ablation suite | Autonomous drone hardware automation |
| Deep cross-modal gated attention network | Chatbots or generic conversational LLM wrappers |
| Monte Carlo Dropout uncertainty estimation | Unrelated multi-crop recommendation engines |
| Game-theoretic XAI factor attributions (SHAP) | Sub-field parcel robotics |
| AWD water advice, cultivar matrix & pest risk forewarning | In-situ chemical pesticide dispensing pumps |
| FastAPI REST API & Interactive React Dashboard | |

---

## 4. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph DataSources ["1. Multi-Source Ingestion & Lineage"]
        S1["DES / ICRISAT Statistics\n(District Yield Ground Truth)"]
        S2["NASA POWER\n(Agro-Meteorology)"]
        S3["MODIS MOD13Q1\n(Satellite Vegetation)"]
        S4["ISRIC SoilGrids 2.0\n(0-30cm Pedometrics)"]
    end

    subgraph PreprocessingLayer ["2. Harmonization & Leakage Prevention"]
        S1 & S2 & S3 & S4 --> Align["Spatio-Temporal Alignment Tuple\n(District, State, Year, Season)"]
        Align --> Split["Strict Temporal Holdout Partitioning\nTrain: <=2014 | Val: 2015-16 | Test: >=2017"]
        Split --> FeatEng["Climate-Aware Feature Engineering\n- Rainfall & Temp Anomalies\n- Extreme Heat & Dry Spell Indices\n- Canopy Z-score Anomalies"]
    end

    subgraph ModelZoo ["3. Model Zoo & Ablation Suite"]
        FeatEng --> Baselines["Baselines: Naive Mean, Ridge, RF, XGBoost"]
        FeatEng --> DL["Deep Learning:\n- Tabular Flat Deep MLP\n- ClimateRice-FusionNet (Cross-Modal Attention)"]
    end

    subgraph EvaluationXAI ["4. Evaluation & Explainable AI"]
        Baselines & DL --> Eval["Ablation Suite (Exp A - Exp G)\n- MAE, RMSE, NRMSE, R²\n- Paired t-test & Wilcoxon"]
        DL --> XAI["Explainable AI (SHAP Engine)\n- Global Sensitivity Ranking\n- Local Waterfall Factor Decompositions"]
    end

    subgraph ServingDeployment ["5. Backend REST API & Frontend"]
        Eval & XAI --> API["FastAPI REST Server (Port 8000)\n- POST /api/v1/predict\n- POST /api/v1/predict/explain\n- GET /api/v1/locations\n- GET /api/v1/benchmark"]
        API --> UI["React 18 + Vite Dashboard (Port 5173)\n- Overview & Hypotheses\n- Interactive Yield Predictor\n- Leaflet District Map\n- Ablation & Benchmark Tables\n- Viva Presentation Guide"]
    end
```

---

## 5. Neural Architecture: `ClimateRice-FusionNet`

Unlike standard flat concatenation, `ClimateRice-FusionNet` projects each heterogeneous modality into its own dedicated non-linear representation subspace, then applies **cross-modal gated self-attention** to dynamically weight environmental signals:

```
INPUT MODALITIES:
[Satellite: 5]       [Weather: 10]        [Soil: 7]          [History: 4]
      │                    │                  │                   │
      ▼                    ▼                  ▼                   ▼
Dense(16)+Norm+GELU  Dense(32)+Norm+GELU  Dense(16)+Norm+GELU  Dense(16)+Norm+GELU
      │                    │                  │                   │
      └────────────────────┼──────────────────┴───────────────────┘
                           │
                           ▼
          CROSS-MODAL GATED ATTENTION FUSION
          α_m = Softmax(v^T * tanh(W_a * h_m))
                           │
                           ▼
            ATTENDED + HIGHWAY CONCATENATION
                           │
                           ▼
             DENSE PREDICTION HEAD (64 -> 32)
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
      PREDICTED YIELD (t/ha)     MC-DROPOUT UNCERTAINTY (±σ)
```

---

## 6. Dataset Lineage & Variable Schema

### 6.1 Data Sources
* **Ground Truth Target ($t/ha$):** Directorate of Economics and Statistics (DES), Ministry of Agriculture and Farmers Welfare, Govt of India (Open Government Data License India).
* **Weather & Climate:** NASA POWER Agroclimatology API ($0.5^\circ$ grid aggregated to district boundaries).
* **Satellite Remote Sensing:** NASA LP DAAC MODIS MOD13Q1 250m 16-day vegetation products (NDVI, EVI, NDWI).
* **Soil Edaphic Features:** ISRIC SoilGrids 2.0 (250m global digital soil map, CC-BY 4.0).

### 6.2 Modality Features (Total 26 Features)
| Modality | Features | Description & Units |
| :--- | :--- | :--- |
| **Satellite (5)** | `ndvi_mean`, `ndvi_peak`, `evi_mean`, `ndwi_mean`, `ndvi_anomaly` | Optical canopy reflectance, chlorophyll density, water ponding index, standardized Z-score. |
| **Weather (10)** | `rainfall_cumulative_mm`, `rainfall_anomaly_pct`, `temp_min_deg_c`, `temp_max_deg_c`, `temp_mean_deg_c`, `temp_anomaly_deg_c`, `extreme_heat_days`, `consecutive_dry_days`, `relative_humidity_pct`, `solar_radiation_mj_m2` | Monsoon precipitation, percentage anomalies, nocturnal min/max temperatures, days $T_{max} \ge 35^\circ C$, dry spell length, incident solar radiation. |
| **Soil (7)** | `soil_ph`, `soil_organic_carbon_g_kg`, `soil_nitrogen_g_kg`, `soil_clay_pct`, `soil_sand_pct`, `soil_available_water_capacity`, `soil_cation_exchange_capacity` | Topsoil pH ($H_2O$), soil organic carbon ($g/kg$), nitrogen, texture fractions, volumetric available water capacity, CEC. |
| **Historical (4)** | `historical_yield_lag1`, `historical_yield_lag2`, `historical_yield_3yr_mean`, `sown_area_ha` | Autoregressive yield lags ($t/ha$), 3-year rolling mean, total district sown area ($ha$). |

---

## 7. Experimental Results & Dual Ablation Suites

Experiments were conducted on both (1) authentic observational records from DES APY and (2) the strictly held-out temporal partition ($t \ge 2017$, 96 records) of the calibrated semi-synthetic benchmark.

### 7.1 Authentic Observational Results ($N = 303$ Ground-Truth Records, 2001–2022)
*Evaluated on genuine Directorate of Economics & Statistics (DES APY) historical harvests and real-world Earth observation inputs (held-out test $N=36$, 2013–2014):*

| Model / Architecture | Modalities / Inputs | Test MAE ($t/ha$) | Test RMSE ($t/ha$) | Test $R^2$ Score | Held-Out Coverage | Operational Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Historical District Mean** | Static training mean ($\bar{y}_{\text{train}}$) | 0.6222 | 0.9022 | -0.1727 | N/A | Fails to capture inter-annual climate anomalies. |
| **Random Forest Regressor** | 100 bagged trees ($\text{depth}=6$) | 0.3932 | 0.5559 | 0.5548 | N/A | Non-linear ensemble; slight variance on small sample. |
| **XGBoost Regressor** | 150 gradient boosted trees ($\eta=0.05$, depth 4) | 0.3699 | 0.5332 | 0.5904 | N/A | Strong gradient boosting baseline. |
| **Linear Regression (Ridge)** | L2 regularized linear model ($\alpha=10.0$) | 0.3502 | 0.4771 | 0.6720 | N/A | Robust regularized linear benchmark. |
| **ClimateRice-FusionNet** | Multi-branch cross-modal attention + MC-Dropout | **0.3366** | **0.4711** | **0.6803** | **44.44% uncal. (83.33% conf.)** | **Lowest error and highest variance explained on real observational data.** |

> **Real-World Empirical Finding:** On authentic observational field data, **`ClimateRice-FusionNet` achieves the lowest error ($\text{MAE} = 0.3366\text{ t/ha}, \text{RMSE} = 0.4711\text{ t/ha}, R^2 = 0.6803$)**, outperforming XGBoost ($\text{MAE} = 0.3699\text{ t/ha}, R^2 = 0.5904$). Dynamic cross-modal attention helps the neural network suppress noisy modality channels during real-world weather anomalies. Split-conformal calibration lifts held-out predictive interval coverage from $44.44\%$ to $83.33\%$ (5-split cross-validation mean: $90.56\% \pm 2.83\%$).

### 7.2 Feature-Modality Ablation Matrix using XGBoost (Exp A – Exp G, calibrated semi-synthetic benchmark, $N = 504$)
*Evaluates the marginal predictive value of adding environmental feature sets for tabular gradient boosting on the benchmark partition:*

| Experiment ID | Included Modalities | Dim | Test MAE ($t/ha$) | Test RMSE ($t/ha$) | Test $R^2$ Score | Benchmark Evaluation Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp A** | Weather Only | 10 | 0.9132 | 1.1055 | 0.2081 | Meteorological supply alone cannot capture soil buffers or canopy vigor. |
| **Exp B** | Satellite Only | 5 | 0.5335 | 0.7025 | 0.6802 | Optical greenness captures standing biomass but saturates in dense canopies. |
| **Exp C** | Soil Only | 7 | 0.4073 | 0.5045 | 0.8351 | Static edaphic fertility sets district-level baseline capacity. |
| **Exp D** | Weather + Soil | 17 | 0.3368 | 0.4214 | 0.8849 | Coupling atmospheric precipitation with soil moisture capacity reduces error. |
| **Exp E** | Satellite + Weather | 15 | 0.5022 | 0.6579 | 0.7195 | Meteorological drivers contextualize optical canopy anomalies. |
| **Exp F** | Satellite + Weather + Soil | 22 | 0.3632 | 0.4696 | 0.8571 | Complete biophysical environmental model without historical autoregression. |
| **Exp G** | **Full-feature XGBoost (+History)** | **26** | **0.2014** | **0.2641** | **0.9548** | **Strongest numerical predictor on calibrated semi-synthetic benchmark ($N=504$).** |

### 7.3 Neural Modality Ablation Matrix using ClimateRice-FusionNet (Exp FN-A – Exp FN-G, calibrated semi-synthetic benchmark, $N = 504$)
*Evaluates deep cross-modal neural attention as heterogeneous modality branches are added:*

| Experiment ID | Included Modalities | Dim | Test MAE ($t/ha$) | Test RMSE ($t/ha$) | Test $R^2$ Score | Benchmark Evaluation Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp FN-A** | Weather Only | 10 | 1.2050 | 1.4140 | -0.2957 | Neural network underfits unstructured meteorological variance alone. |
| **Exp FN-B** | Satellite Only | 5 | 0.5793 | 0.6971 | 0.6851 | Canopy reflectance provides solid foundation for neural embeddings. |
| **Exp FN-C** | Soil Only | 7 | 0.5578 | 0.6361 | 0.7378 | Edaphic branches establish spatial prior representations. |
| **Exp FN-D** | Weather + Soil | 17 | 0.3941 | 0.4521 | 0.8676 | Latent interaction captures moisture-holding physics. |
| **Exp FN-E** | Satellite + Weather | 15 | 0.4456 | 0.5351 | 0.8145 | Cross-modal attention balances canopy reflectance and rain supply. |
| **Exp FN-F** | Satellite + Weather + Soil | 22 | 0.3532 | 0.4191 | 0.8862 | Biophysical multimodal neural baseline. |
| **Exp FN-G** | **ClimateRice-FusionNet Full (+History)** | **26** | **0.2774** | **0.3217** | **0.9329** | **Deep neural architecture with dynamic attention & MC uncertainty ($N=504$).** |

### 7.4 Model Architecture Benchmark (Full 26 Features, calibrated semi-synthetic benchmark, $N = 504$)

| Model Family | Architecture Details | Test MAE ($t/ha$) | Test RMSE ($t/ha$) | Test $R^2$ Score | Operational Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Naive Baseline** | Historical district mean ($\bar{y}_{dist}$) | 0.4043 | 0.5015 | 0.8371 | Non-parametric baseline. |
| **Ridge Regression** | L2 regularized linear model | 0.2303 | 0.2921 | 0.9447 | Fast, interpretable linear benchmark. |
| **Random Forest** | 150 bagged de-correlated trees | 0.2134 | 0.2878 | 0.9463 | Non-linear feature subsampling. |
| **XGBoost Regressor (Baseline)** | 200 gradient boosted trees ($\eta=0.05$, depth 6) | 0.2073 | 0.2733 | 0.9516 | Strong traditional machine-learning baseline. |
| **Full-feature XGBoost (Exp G)** | 180 gradient boosted trees ($\eta=0.05$, depth 5) | **0.2014** | **0.2641** | **0.9548** | **Lowest numerical error (calibrated semi-synthetic benchmark, $N=504$).** |
| **Deep MLP** | 3-layer dense network with BatchNorm | 0.4074 | 0.4676 | 0.8583 | Non-linear flat tabular neural baseline. |
| **ClimateRice-FusionNet** | Cross-modal attention + MC-Dropout | **0.2774** | **0.3217** | **0.9329** | **Dynamic cross-modal attention & MC Dropout predictive intervals (benchmark coverage = 95.83%).** |

> **Scientific Finding:** On the calibrated semi-synthetic tabular benchmark ($N = 504$), gradient boosted trees (`Full-feature XGBoost`) achieve lower point prediction error ($\text{MAE} = 0.2014\text{ t/ha}$) than the deep neural network (`ClimateRice-FusionNet`, $\text{MAE} = 0.2774\text{ t/ha}, p = 0.0019$). This is consistent with empirical literature on tabular benchmarks (Grinsztajn et al., NeurIPS 2022). `ClimateRice-FusionNet` provides complementary value through differentiable cross-modal attention weights and MC Dropout predictive intervals (empirical coverage = 95.83% on benchmark, 44.44% on raw observational data).

---

## 8. Explainable AI (SHAP) Insights

* **Dominant Modalities:** Weather ($41.8\%$) and Satellite ($35.7\%$) represent the primary drivers of model sensitivity, followed by Historical trends ($15.0\%$) and Soil edaphics ($7.5\%$).
* **Primary Climatic Stressors:**
  1. `extreme_heat_days` ($T_{\max} \ge 35^\circ\text{C}$ during anthesis): Negative impact of $-0.21\text{ to }-0.35\text{ t/ha}$ during heatwave shocks.
  2. `rainfall_anomaly_pct` (Monsoon deficit $< -25\%$): Dominant negative contributor in rainfed upland districts (e.g. Raipur, Bilaspur), depressing yield by up to $-0.45\text{ t/ha}$.
* **Primary Positive Facilitators:**
  1. `rainfall_cumulative_mm` & `ndvi_mean`: Sustained canopy greenness and adequate seasonal water supply contribute $+0.25\text{ to }+0.40\text{ t/ha}$.
  2. `soil_clay_pct` & `soil_organic_carbon_g_kg`: Soil moisture retention capacity buffers dry spell impact.

---

## 9. Quickstart & Installation

### 9.1 Prerequisites
* Python 3.12+
* Node.js v20+ / v22+ and npm
* NVIDIA GPU with CUDA support (Optional; CPU fallback is fully supported)

### 9.2 Python Environment Setup
```powershell
# Clone repository
git clone https://github.com/piyushkumar/ClimateRice-AI.git
cd ClimateRice-AI

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 9.3 Run Preprocessing, Training & Evaluation
```powershell
# 1. Acquire & validate raw multi-district dataset
python scripts/download_data.py

# 2. Perform leakage-free temporal partitioning (Train <=2014, Val 2015-16, Test >=2017)
python scripts/preprocess.py

# 3. Train all baselines & ClimateRice-FusionNet with GPU acceleration
python scripts/train.py

# 4. Generate publication-quality figures & evaluation reports
python scripts/evaluate.py

# 5. Run test prediction via CLI
python scripts/predict.py --district Ludhiana
```

### 9.4 Run Test Suite
```powershell
python -m pytest tests/ -v
# 39 unit, integration, browser regression, and conformal calibration tests passing:
# - 15 API route contracts & conformal calibration validation (test_api.py)
# - 6 Selenium Chrome headless browser regression (test_browser_regression.py)
# - 6 Frontend state & profile integration (test_frontend_integration.py)
# - 5 Climate feature formulas & bounds (test_features.py)
# - 3 Model architecture & baseline verification (test_models.py)
# - 4 Temporal leakage-free preprocessing splits (test_preprocessing.py)
```

### 9.5 Start Backend Server
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
# OpenAPI Docs: http://127.0.0.1:8000/docs
```

### 9.6 Start Frontend Dashboard
```powershell
cd frontend
npm install
npm run dev
# Dashboard URL: http://localhost:5173
```

---

## 10. Docker Deployment

Launch both backend and frontend simultaneously with Docker Compose:
```powershell
docker-compose up --build
```
* **API Service:** `http://localhost:8000`
* **Web Dashboard:** `http://localhost:3000`

---

## 11. REST API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System liveness probe, CUDA device name, PyTorch status. |
| `GET` | `/api/v1/locations` | Geo-coordinates, agro-ecological zone, and baseline yields for 24 districts. |
| `GET` | `/api/v1/history/{district}` | Multi-decadal historical yield and climate time-series. |
| `GET` | `/api/v1/benchmark` | Modality ablation metrics and hypothesis testing statistics. |
| `GET` | `/api/v1/features` | Feature schema, units, and physical agronomic bounds. |
| `POST` | `/api/v1/predict` | End-to-end multimodal yield prediction, uncertainty, and attention weights. |
| `POST` | `/api/v1/predict/explain` | Local game-theoretic factor attributions (top positive & negative stressors). |

### Example Prediction Request (`POST /api/v1/predict`)
```json
{
  "district_name": "Burdwan",
  "state_name": "West Bengal",
  "crop_year": 2021,
  "season": "Kharif",
  "ndvi_mean": 0.68,
  "ndvi_peak": 0.78,
  "evi_mean": 0.52,
  "ndwi_mean": 0.28,
  "ndvi_anomaly": 0.45,
  "rainfall_cumulative_mm": 1380.0,
  "rainfall_anomaly_pct": -4.5,
  "temp_min_deg_c": 24.8,
  "temp_max_deg_c": 33.5,
  "temp_mean_deg_c": 29.15,
  "temp_anomaly_deg_c": 0.35,
  "extreme_heat_days": 4,
  "consecutive_dry_days": 8,
  "relative_humidity_pct": 78.0,
  "solar_radiation_mj_m2": 17.5,
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
  "sown_area_ha": 140000.0
}
```

### Example Prediction Response
```json
{
  "district_name": "Burdwan",
  "predicted_yield_tonnes_per_hectare": 3.79,
  "epistemic_uncertainty_std": 0.474,
  "predictive_interval": [3.29, 4.29],
  "empirical_coverage_pct": 95.83,
  "risk_level": "Moderate Risk (Marginal Stress Conditions)",
  "modality_attention_weights": {
    "satellite": 0.3552,
    "weather": 0.3341,
    "soil": 0.2247,
    "historical": 0.0860
  },
  "top_positive_factors": [
    { "feature": "rainfall_cumulative_mm", "modality": "weather", "value": 1380.0, "influence": 0.2538, "direction": "positive" },
    { "feature": "ndvi_anomaly", "modality": "satellite", "value": 0.45, "influence": 0.1662, "direction": "positive" }
  ],
  "top_negative_factors": [
    { "feature": "ndvi_mean", "modality": "satellite", "value": 0.68, "influence": -0.1137, "direction": "negative" }
  ],
  "model_version": "ClimateRice-FusionNet v1.0.0"
}
```

---

## 12. Viva Presentation & Examination Defense Guide

### 12.1 Key Talking Points
1. **Research Question:** We designed the system specifically to test whether combining heterogeneous environmental modalities outperforms single-source modeling.
2. **Leakage Prevention:** Emphasize that we avoided naive random K-fold splits, implementing a **strict temporal holdout** (Train $\le 2014$, Test $\ge 2017$) to test real-world forecasting into unseen future years.
3. **Hypothesis Testing:** State the exact p-value: $p = 2.54 \times 10^{-7} \ll 0.05$, confirming $H_1$ with a $0.2652\text{ t/ha}$ error reduction over satellite alone.
4. **Honest Model Comparison:** Clarify that XGBoost achieved $0.2073\text{ t/ha}$ MAE on flat tabular features, while `ClimateRice-FusionNet` ($0.2774\text{ t/ha}$) provides cross-modal dynamic attention and MC Dropout predictive intervals (empirical coverage = 95.83%).
5. **Explainability:** Explain that SHAP attributes marginal deviations relative to the 2.85 t/ha base, highlighting that these are model sensitivities rather than proof of direct physical causation.

---

## 13. Documentation Index

Detailed academic documentation is structured in `docs/`:
* [`docs/methodology.md`](docs/methodology.md): Mathematical formulations, loss functions, attention equations, hypothesis tests.
* [`docs/dataset.md`](docs/dataset.md): Lineage, licenses, geographical boundaries, physical valid ranges.
* [`docs/architecture.md`](docs/architecture.md): Deep neural schematics, API structures, Mermaid diagrams.
* [`docs/experiments.md`](docs/experiments.md): Modality ablation specifications and evaluation protocols.
* [`docs/limitations.md`](docs/limitations.md): Spatial aggregation, monsoon cloud cover, unobserved fertilizer practices.
* [`docs/future_work.md`](docs/future_work.md): Sentinel-1 SAR cloud penetration, field-level 10m gridded downscaling.
* [`docs/references.md`](docs/references.md): Real, peer-reviewed scientific literature citations with DOIs.

---

## 14. License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
