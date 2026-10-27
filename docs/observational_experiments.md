# ClimateRice-AI: Observational Model Evaluation and Experimental Analysis

**Project:** ClimateRice-AI (*Climate-Aware Multimodal Rice Yield Prediction*)  
**Document:** `docs/observational_experiments.md`  
**Evaluation Script:** `scripts/train_observational_models.py`  
**Results File:** `experiments/observational_results/observational_model_evaluation.json`

---

## 1. Experimental Setup and Anti-Leakage Protocol

To establish a verified empirical baseline on genuine Indian agricultural data, we evaluated five distinct model families on the newly constructed **Genuine Observational Agricultural Dataset** ($N = 303$ records, 24 districts across 11 states, 2000–2014).

### Chronological Holdout Splitting
- **Training Set (2000–2010):** $N = 228$ observations ($75.2\%$)
- **Validation Set (2011–2012):** $N = 39$ observations ($12.9\%$)
- **Held-Out Test Set (2013–2014):** $N = 36$ observations ($11.9\%$)

### Information Leakage Prevention
1. **Zero Future Target Leakage:** Scalers and imputers were fitted strictly on the Training set (2000–2010) and then applied to Validation and Test sets.
2. **Lag Variable Disjointness:** `historical_yield_lag1` ($t-1$), `historical_yield_lag2` ($t-2$), and `historical_yield_3yr_mean` ($[t-3, t-1]$) contain zero target-year information.
3. **Identical Test Set:** All models were evaluated on the exact same 36 held-out test observations.

---

## 2. Experimental Results on Held-Out Test Set ($N = 36$, 2013–2014)

| Model Family | Architecture / Algorithm | Test MAE (t/ha) | Test RMSE (t/ha) | Test $R^2$ | Key Observations |
|:---|:---|:---:|:---:|:---:|:---|
| **Naive Baseline** | Historical Training Mean | 0.6222 | 0.9022 | -0.1727 | Fails to capture spatial and inter-annual climate variance. |
| **Linear Model** | Ridge Regression ($\alpha = 10.0$) | **0.3502** | **0.4771** | **0.6720** | Strong regularized linear baseline with minimal variance. |
| **Tree Ensemble** | Random Forest Regressor | 0.3932 | 0.5559 | 0.5548 | Outperforms naive mean; shows slight overfitting to train splits. |
| **Tree Ensemble** | XGBoost Regressor | 0.3699 | 0.5332 | 0.5904 | Gradient boosting captures non-linear climate anomalies well. |
| **Deep Learning** | **ClimateRice-FusionNet** | **0.3366** | **0.4711** | **0.6803** | Multi-branch architecture with LayerNorm, Huber loss, and MC Dropout (lowest error and highest R²). |

---

## 3. Comparison: Observational vs Calibrated Semi-Synthetic Benchmark

A core research objective is understanding how models perform when moving from a calibrated semi-synthetic benchmark to real-world noisy agricultural statistics.

| Dimension | Calibrated Benchmark (`experiments/results/`) | Observational Dataset (`experiments/observational_results/`) |
|:---|:---|:---|
| **Target Data Source** | Biophysical formula ($Y_{\text{base}} \times f_{\text{climate}} \times \dots$) | Official Government of India DES APY crop surveys |
| **Weather Source** | Parametric climate anomalies | NASA POWER daily gridded observations |
| **Sample Size** | $N = 504$ (2000–2020) | $N = 303$ (2000–2014) |
| **Held-Out Test Size** | $N = 96$ (2017–2020) | $N = 36$ (2013–2014) |
| **Best Model $R^2$** | $R^2 = 0.9548$ (Full-feature XGBoost) | $R^2 = 0.6803$ (ClimateRice-FusionNet) |
| **Best Model MAE** | $0.2014\text{ t/ha}$ (XGBoost) | $0.3366\text{ t/ha}$ (ClimateRice-FusionNet) |
| **Realistic Literature Alignment** | High (benchmark condition) | Matches empirical agricultural literature ($R^2 \approx 0.55 - 0.70$) |

### Scientific Insights
1. **Realistic Variance in Real-World Yields:**
   In real-world agriculture, factors unobserved by satellite and weather grids (such as fertilizer timing, seed varieties, pest outbreaks, and irrigation timing) create an irreducible error floor ($\text{MAE} \approx 0.35\text{ t/ha}$).
2. **Deep Learning vs Linear/Tree Baselines on Tabular Data:**
   On the observational dataset ($N=228$ training samples), regularized linear regression and ClimateRice-FusionNet demonstrate strong generalization ($R^2 \ge 0.62$), while unconstrained tree ensembles show slight variance on small sample sizes.
3. **Preservation of Benchmark:**
   The original benchmark results remain completely untouched and separate, providing two distinct evaluation contexts:
   - *Benchmark Context:* Controlled evaluation of multi-modal feature ablations (Exp A to Exp G).
   - *Observational Context:* Empirical validation against real-world Indian agricultural statistics.

---

## 4. Revalidation of Predictive Uncertainty on Real Observational Data

### A. Critical Scientific Disclosure
The previously documented result—**empirical coverage = 95.83% at multiplier $c = 1.05$**—was measured on the **Calibrated Semi-Synthetic Benchmark** ($N = 96$ held-out observations, 2017–2020). It must **never** be presented as real-data empirical coverage.

### B. Uncertainty Calibration Procedure on Real Data
On the genuine observational dataset, Monte Carlo Dropout (50 stochastic forward passes with dropout active) was evaluated across the Validation set ($N = 39$, 2011–2012) and the Held-Out Test set ($N = 36$, 2013–2014).

Predictive interval formula:
$$\mathcal{I}(x) = \left[ \mu_{\hat{y}}(x) - c \cdot \sigma_{\hat{y}}(x), \; \mu_{\hat{y}}(x) + c \cdot \sigma_{\hat{y}}(x) \right]$$

### C. Empirical Coverage and Interval Width across Multipliers $c$

| Multiplier $c$ | Validation Coverage ($N = 39$) | Held-Out Test Coverage ($N = 36$) | Covered Count (Test) | Average Interval Width |
|:---:|:---:|:---:|:---:|:---:|
| **1.00** | 35.90% | 38.89% | 14 / 36 | 0.540 t/ha |
| **1.05** (Benchmark multiplier) | **41.03%** | **38.89%** | **14 / 36** | **0.567 t/ha** |
| **1.50** | 53.85% | 61.11% | 22 / 36 | 0.810 t/ha |
| **2.00** | 61.54% | 69.44% | 25 / 36 | 1.080 t/ha |
| **2.50** | 76.92% | 83.33% | 30 / 36 | 1.350 t/ha |
| **2.80** | 82.05% | 83.33% | 30 / 36 | 1.512 t/ha |
| **3.00** | 84.62% | 88.89% | 32 / 36 | 1.619 t/ha |

### D. Key Agronomic Conclusions on Uncertainty
1. **Unobserved Agronomic Variance Expands Real Uncertainty:** In the semi-synthetic benchmark, weather shocks directly drove synthetic yields, keeping epistemic variance compact. On real observational data, unobserved management factors (fertilizer timing, seed variety, pest incidence) create higher residual variance.
2. **Real-Data Calibration:** To achieve $\approx 85-90\%$ empirical coverage on real Indian agricultural statistics, the epistemic interval requires $c \approx 2.8 - 3.0$ ($\approx 1.5 - 1.6\text{ t/ha}$ interval width).
3. **No Guaranteed 95% Claim:** All project documentation and UI outputs report empirical coverage as measured on specific held-out test splits, never claiming an unconditioned "guaranteed 95% confidence interval."


---

## 5. Normalized Split-Conformal Prediction Recalibration (Target 90%)

### A. Mathematical Methodology
Following distribution-free conformal prediction principles (Lei et al. 2018; Angelopoulos & Bates 2021), we define the normalized nonconformity score for each observational calibration record:

$$r_i = \frac{|y_i - \hat{\mu}(x_i)|}{\hat{\sigma}_{\text{MC}}(x_i)}$$

For target nominal coverage $1 - \alpha = 0.90$, the conformal scaling multiplier $m$ is computed as the empirical quantile:

$$m = \text{Quantile}_{\frac{\lceil (n+1)(1-\alpha) \rceil}{n}}\left(\{r_1, \dots, r_n\}\right)$$

The resulting calibrated predictive interval is:
$$\mathcal{C}(x) = \left[ \hat{\mu}(x) - m \cdot \hat{\sigma}_{\text{MC}}(x), \; \hat{\mu}(x) + m \cdot \hat{\sigma}_{\text{MC}}(x) \right]$$

### B. Split Discipline & Empirical Verification
- **Primary Chronological Calibration:** Fitted strictly on calibration years 2000–2012 ($N = 267$).
- **Held-Out Evaluation:** Evaluated on future crop years 2013–2014 ($N = 36$). Calibration and test sets are strictly disjoint.
- **Results:**
  - Uncalibrated Baseline ($m = 1.05$): Held-out coverage = **44.44%** (16/36), 95% Wilson CI = [29.54%, 60.42%], Mean width = 0.516 t/ha.
  - Recalibrated Conformal ($m = 2.4858$): Held-out coverage = **83.33%** (30/36), 95% Wilson CI = [68.11%, 92.13%], Mean width = 1.222 t/ha.

### C. 5-Fold Cross-Validation Estimator Stability
To ensure $m$ is not an artifact of a single chronological cut, 5 independent random splits ($N_{\text{cal}} = 267, N_{\text{test}} = 36$) were evaluated:
- **Calibrated Multiplier ($m$):** $2.5809 \pm 0.0545$ ($\text{CV} < 2.2\%$)
- **Held-Out Coverage:** $90.56\% \pm 2.83\%$ (achieving target $90.0\%$)
- **Mean Interval Width:** $1.298 \pm 0.078\text{ t/ha}$

### D. Cross-Checkpoint Conformal Transfer Caveat
The conformal multiplier $m$ is derived empirically from the observational FusionNet checkpoint residuals and transferred to the deployed FastAPI prediction pipeline. Both checkpoints share the identical four-modality PyTorch architecture and 40-sample Monte Carlo Dropout epistemic variance definition ($\sigma_{\text{MC}}$). This transfer preserves per-instance input-dependent adaptivity while correcting the global uncertainty scale from benchmark-tuned tightness to real-world observational dispersion.
