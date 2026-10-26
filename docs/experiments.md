## 1. Objective of Experiments & Research Hypotheses

The experimental evaluation addresses the updated research question:
> *"Can integrating satellite, weather, soil, and historical agricultural information improve rice-yield prediction, and how does a multimodal deep-learning architecture compare with strong traditional machine-learning baselines?"*

### Formal Hypotheses
* **Alternative Hypothesis ($H_1$):** Multimodal feature integration combining satellite vegetation indices, meteorological anomalies, digital pedometrics, and historical agricultural records achieves a statistically significant error reduction ($MAE$, $RMSE$) compared to single-modality configurations.
* **Null Hypothesis ($H_0$):** Multimodal feature integration does not provide a statistically significant improvement ($p \ge 0.05$) over single-modality models.

### Scientific Model Comparison Protocol
The benchmark independently compares:
1. **Traditional Machine Learning (XGBoost):** Evaluated as the primary tabular numerical regressor.
2. **Deep Multimodal Neural Architecture (ClimateRice-FusionNet):** Evaluated for cross-modal gated attention representations and epistemic uncertainty quantification via 50-pass Monte Carlo Dropout.

---

## 2. Controlled Dual Ablation Matrices

All ablation experiments use identical training ($t \le 2014$), validation ($2015-2016$), and test ($t \ge 2017$) partitions, fixed random seeds, and identical preprocessing transformations fit strictly on training splits of the **Calibrated Semi-Synthetic Multimodal Agricultural Benchmark** ($N = 504$).

### 2.1 Feature-Modality Ablation Matrix using XGBoost (Exp A – Exp G)
*Evaluates the marginal value of environmental feature sets for tabular gradient boosting:*

| Experiment ID | Modality Combination | Included Features | Total Dim | Research Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Exp A** | Weather Only ($\mathcal{M}_{wea}$) | Rain cum, Rain anom, Tmin, Tmax, Tmean, Temp anom, Heat days, CDD, Humidity, Solar rad | 10 | Meteorological sensitivity & climate anomalies |
| **Exp B** | Satellite Only ($\mathcal{M}_{sat}$) | NDVI mean, NDVI peak, EVI mean, NDWI mean, NDVI anomaly | 5 | Optical canopy vigor & greenness index sensitivity |
| **Exp C** | Soil Only ($\mathcal{M}_{soil}$) | Soil pH, SOC, Nitrogen, Clay %, Sand %, Water capacity, CEC | 7 | Baseline edaphic & nutrient fertility constraint |
| **Exp D** | Weather + Soil ($\mathcal{M}_{wea} + \mathcal{M}_{soil}$) | Weather (10) + Soil (7) | 17 | Atmospheric supply vs. edaphic water/nutrient retention |
| **Exp E** | Satellite + Weather ($\mathcal{M}_{sat} + \mathcal{M}_{wea}$) | Satellite (5) + Weather (10) | 15 | Observed canopy reflectance response under atmospheric drivers |
| **Exp F** | Satellite + Weather + Soil ($\mathcal{M}_{sat} + \mathcal{M}_{wea} + \mathcal{M}_{soil}$) | Satellite (5) + Weather (10) + Soil (7) | 22 | Complete biophysical environmental representation |
| **Exp G** | **Full-feature XGBoost** ($\mathcal{M}_{all} + \mathcal{M}_{hist}$) | Satellite (5) + Weather (10) + Soil (7) + Lag-1, Lag-2, 3-Yr Mean, Area | 26 | Optimal tabular predictor ($R^2 = 0.9548, \text{MAE} = 0.2014$) |

### 2.2 Neural Modality Ablation Matrix using ClimateRice-FusionNet (Exp FN-A – Exp FN-G)
*Evaluates deep cross-modal gated attention as heterogeneous modality branches are added:*

| Experiment ID | Modality Combination | Encoders Active | Dim | Test MAE ($t/ha$) | Test $R^2$ Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp FN-A** | Weather Only | Weather Encoder | 10 | 1.2050 | -0.2957 |
| **Exp FN-B** | Satellite Only | Satellite Encoder | 5 | 0.5793 | 0.6851 |
| **Exp FN-C** | Soil Only | Soil Encoder | 7 | 0.5578 | 0.7378 |
| **Exp FN-D** | Weather + Soil | Weather + Soil Encoders | 17 | 0.3941 | 0.8676 |
| **Exp FN-E** | Satellite + Weather | Satellite + Weather Encoders | 15 | 0.4456 | 0.8145 |
| **Exp FN-F** | Satellite + Weather + Soil | Sat + Wea + Soil Encoders | 22 | 0.3532 | 0.8862 |
| **Exp FN-G** | **ClimateRice-FusionNet Full** | **All 4 Modality Encoders + Attention** | **26** | **0.2774** | **0.9329** |

---

## 3. Evaluated Model Architectures

Each modality combination is evaluated across a spectrum of model families to distinguish architectural effects from data fusion effects:

1. **Naive Historical District Mean:** Baseline estimating $\hat{y}_{i, t} = \bar{y}_{i, \text{train}}$.
2. **Regularized Linear Regression (Ridge):** L2-regularized linear baseline with cross-validated penalty $\alpha \in [10^{-3}, 10^{2}]$.
3. **Random Forest Regressor:** Non-linear bagged ensemble ($n_{estimators}=150$, $max\_depth=12$).
4. **XGBoost Regressor:** Extreme gradient boosted decision trees ($n_{estimators}=200$, $\eta=0.05$, $subsample=0.8$, $colsample\_bytree=0.8$).
5. **Flat Deep MLP:** Standard deep feed-forward neural network concatenating input features into a shared dense representation.
6. **ClimateRice-FusionNet:** Deep multimodal fusion architecture with modality-specific non-linear encoders, cross-modal gated self-attention, and MC-Dropout uncertainty head.

---

## 4. Evaluation Metrics & Statistical Protocol

### 4.1 Quantitative Metrics
* **Mean Absolute Error (MAE):** $\frac{1}{N}\sum |y_i - \hat{y}_i|$ (tonnes/ha)
* **Root Mean Squared Error (RMSE):** $\sqrt{\frac{1}{N}\sum (y_i - \hat{y}_i)^2}$ (tonnes/ha)
* **Normalized RMSE (NRMSE):** $\frac{RMSE}{\bar{y}_{test}}$ (%)
* **Coefficient of Determination ($R^2$):** $1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$

### 4.2 Statistical Significance Testing
* **5-Fold Seed Repetition:** To verify robustness against initialization variance, every model is trained across 5 distinct random seeds ($\{42, 101, 2024, 7, 999\}$). Results are reported as $\text{Mean} \pm \text{Std}$.
* **Paired Student's t-test:** Tests whether the mean absolute error difference between the Full Multimodal Model and the strongest baseline/single modality is statistically distinguishable from zero.
* **Wilcoxon Signed-Rank Test:** Non-parametric validation testing error distribution differences without assuming normality of residuals.
* **Significance Threshold:** $\alpha = 0.05$ ($p < 0.05 \implies$ Rejection of $H_0$).

---

## 5. Error & Failure Mode Analysis

The experimental evaluation will explicitly dissect model performance across challenging agricultural conditions:
1. **Low-Yield Regimes ($< 1.8\text{ t/ha}$):** Rainfed marginal farming districts prone to crop failure.
2. **High-Yield Regimes ($> 4.0\text{ t/ha}$):** Intensively irrigated, input-heavy agro-ecosystems (e.g. Punjab, Haryana).
3. **Drought Shock Years:** Crop seasons exhibiting severe rainfall deficits ($> -25\%$ anomaly).
4. **Extreme Heat Stress:** Seasons with $> 10$ extreme heat days during critical reproductive windows.
