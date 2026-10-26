# System Architecture: ClimateRice-AI

## 1. End-to-End System Pipeline

The **ClimateRice-AI** system is architected as a modular, decoupled research and production platform consisting of six primary subsystems:

```mermaid
flowchart TD
    subgraph DataLayer ["1. Data & Alignment Subsystem"]
        A1["DES / ICRISAT Statistics\n(District Yield Ground Truth)"]
        A2["NASA POWER\n(Agro-Meteorology)"]
        A3["MODIS MOD13Q1\n(Satellite Vegetation)"]
        A4["ISRIC SoilGrids 2.0\n(Edaphic Properties)"]
        A1 & A2 & A3 & A4 --> B["Data Ingestion & Alignment Engine\n(District-Season-Year Tuple Join)"]
        B --> C["Data Validation & Leakage-Free Temporal Split\n(Train: <=2014, Val: 2015-16, Test: >=2017)"]
    end

    subgraph FeatureLayer ["2. Climate-Aware Feature Engineering"]
        C --> D["Feature Transformers\n- NDVI/EVI/NDWI Dynamics\n- Extreme Heat & Dry Spell Days\n- Climate Anomalies (% departure)\n- Soil Water Retention Capacity\n- Autoregressive Historical Lags"]
    end

    subgraph ModelLayer ["3. Multimodal Model Zoo"]
        D --> E1["Baselines: Naive, Ridge, RF, XGBoost"]
        D --> E2["ClimateRice-FusionNet\n- Satellite Branch (d=16)\n- Weather Branch (d=32)\n- Soil Branch (d=16)\n- History Branch (d=16)\n- Cross-Modal Gated Attention\n- MC-Dropout Uncertainty Head"]
    end

    subgraph EvaluationXAI ["4. Evaluation & Explainability"]
        E1 & E2 --> F["Evaluation Engine\n- MAE, RMSE, R²\n- Modality Ablation Matrix\n- Paired t-test & Wilcoxon"]
        E2 --> G["Explainable AI Engine\n- Global Feature Importance (SHAP)\n- Local Waterfall Attributions"]
    end

    subgraph ServingLayer ["5. FastAPI Backend"]
        E2 & G --> H["Model Registry & Serialization\n(.pt, .json artifacts)"]
        H --> I["FastAPI REST API\n- GET /api/v1/health\n- POST /api/v1/predict\n- POST /api/v1/predict/explain\n- GET /api/v1/locations\n- GET /api/v1/models/benchmark"]
    end

    subgraph PresentationLayer ["6. Modern React Dashboard"]
        I --> J["Vite + React Dashboard\n- Overview & KPI Summary\n- Interactive Yield Predictor\n- Geospatial District Risk Map\n- Model Benchmark & Ablation\n- SHAP Feature Explainability\n- Research Methodology & Viva Guide"]
    end
```

---

## 2. Neural Architecture: `ClimateRice-FusionNet`

`ClimateRice-FusionNet` addresses the fundamental limitation of standard concatenation by projecting each heterogeneous modality into its own dedicated non-linear representation subspace, followed by a multi-head gated cross-modal attention mechanism:

```mermaid
flowchart TD
    subgraph Inputs ["Input Modalities"]
        InSat["Satellite Features (5)\n[NDVI, EVI, NDWI, etc.]"]
        InWea["Weather Features (10)\n[Rain, Temp, Heat Days, etc.]"]
        InSoil["Soil Features (7)\n[pH, SOC, N, Clay, etc.]"]
        InHist["Historical Features (4)\n[Lags, 3-Yr Mean, Area]"]
    end

    subgraph Encoders ["Modality-Specific Representation Encoders"]
        EncSat["Satellite Encoder\nDense(16) -> LayerNorm -> GELU -> Dropout(0.2)"]
        EncWea["Weather Encoder\nDense(32) -> LayerNorm -> GELU -> Dropout(0.2)"]
        EncSoil["Soil Encoder\nDense(16) -> LayerNorm -> GELU -> Dropout(0.2)"]
        EncHist["Historical Encoder\nDense(16) -> LayerNorm -> GELU -> Dropout(0.2)"]
    end

    InSat --> EncSat
    InWea --> EncWea
    InSoil --> EncSoil
    InHist --> EncHist

    subgraph FusionEngine ["Cross-Modal Attention & Fusion"]
        AttGate["Gated Modality Attention\nalpha = softmax(v^T tanh(W_a * h_m))\nDynamically weights modalities"]
        ConcatBranch["Direct Concatenation Highway\nconcat(h_sat, h_wea, h_soil, h_hist)"]
        EncSat & EncWea & EncSoil & EncHist --> AttGate
        EncSat & EncWea & EncSoil & EncHist --> ConcatBranch
        AttGate & ConcatBranch --> FusedRep["Fused Multimodal Representation (h_fused)"]
    end

    subgraph Predictor ["Uncertainty-Aware Prediction Head"]
        FusedRep --> DenseHead["Dense(64) -> LayerNorm -> GELU -> Dropout(0.25) -> Dense(32)"]
        DenseHead --> OutMean["Predicted Rice Yield (tonnes/ha)"]
        DenseHead --> MCDrop["Monte Carlo Dropout (T=50 passes)\n-> Epistemic Uncertainty (+/- sigma)"]
    end
```

---

## 3. Backend API Architecture (FastAPI)

The backend provides high-performance asynchronous endpoints powered by Pydantic V2 data validation:

* `GET /health` / `GET /api/v1/health`: Liveness and readiness probe, returning server status, GPU/CPU execution device, and active model versions.
* `GET /api/v1/locations`: Returns geographical and agro-climatic metadata for all supported Indian districts (centroid coordinates, state, baseline historical yield).
* `GET /api/v1/history/{district_name}`: Returns time-series historical records of rice yield, climate anomalies, and vegetation indices for a specific district.
* `POST /api/v1/predict`: Accepts multimodal environmental parameters and returns predicted yield ($t/ha$), risk category (`Low Risk`, `Moderate Risk`, `High Risk`), and calibrated uncertainty intervals.
* `POST /api/v1/predict/explain`: Computes local SHAP attributions and returns positive and negative feature influences for an individual prediction.
* `GET /api/v1/models/benchmark`: Returns the comparative evaluation metrics ($MAE, RMSE, R^2$) across all baselines and modality ablation experiments.

---

## 4. Frontend Architecture (React + Vite + Leaflet + Recharts)

The frontend is structured into modular responsive components:
1. **Executive Overview Page:** Real-time metrics overview, research summary, key performance indicators, and dataset coverage metrics.
2. **Yield Prediction Studio:** Interactive environmental slider and input panel allowing users to simulate climate shock scenarios (e.g. $+3^\circ C$ temperature anomaly, $-30\%$ monsoon deficit) and observe predicted yield and uncertainty response in real time.
3. **Geospatial District Risk Map:** Interactive Leaflet choropleth map plotting Indian districts with color-coded yield potential and climate vulnerability indicators.
4. **Model Performance & Ablations:** Interactive comparison charts plotting the 7 controlled modality ablation experiments alongside traditional baselines.
5. **Explainable AI (SHAP) Explorer:** Global beeswarm and waterfall attribution plots detailing feature contributions.
6. **Academic Viva & Methodology:** Interactive walkthrough of problem statement, mathematical derivations, literature references, and defense guidelines.
