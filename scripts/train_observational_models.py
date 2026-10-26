"""Train and Evaluate Machine Learning and Deep Learning Models on the Genuine Observational Agricultural Dataset.

Models Evaluated on Held-Out Test Set (2013-2014, N=36):
1. Mean / Naive Baseline
2. Linear Regression (Ridge)
3. Random Forest Regressor
4. XGBoost Regressor
5. ClimateRice-FusionNet (Multi-branch PyTorch representation learning with MC Dropout)

Strict Evaluation Standards:
- Chronological Holdout (Train: 2000-2010, Val: 2011-2012, Test: 2013-2014)
- Zero future leakage: Fit scaler strictly on Train
- Identical held-out test evaluation observations
- Preserves all existing benchmark results without overwriting
"""

import sys
import os
import json
import logging
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import joblib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


FEATURE_GROUPS = {
    "weather": [
        "rainfall_cumulative_mm",
        "rainfall_anomaly_pct",
        "temp_min_deg_c",
        "temp_max_deg_c",
        "temp_mean_deg_c",
        "temp_anomaly_deg_c",
        "extreme_heat_days",
        "consecutive_dry_days",
        "relative_humidity_pct",
        "solar_radiation_mj_m2",
    ],
    "soil": [
        "soil_ph",
        "soil_organic_carbon_g_kg",
        "soil_nitrogen_g_kg",
        "soil_clay_pct",
        "soil_sand_pct",
        "soil_available_water_capacity",
        "soil_cation_exchange_capacity",
    ],
    "historical": [
        "historical_yield_lag1",
        "historical_yield_lag2",
        "historical_yield_3yr_mean",
        "sown_area_ha",
        "irrigation_ratio",
    ],
}

ALL_FEATURES = [f for grp in FEATURE_GROUPS.values() for f in grp]


class ObservationalFusionNet(nn.Module):
    """PyTorch multi-branch neural network for observational agricultural modalities."""

    def __init__(self, branch_dims: Dict[str, int], embed_dim: int = 16, dropout: float = 0.25):
        super().__init__()
        self.branch_names = list(branch_dims.keys())
        self.encoders = nn.ModuleDict({
            b: nn.Sequential(
                nn.Linear(dim, embed_dim),
                nn.LayerNorm(embed_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            )
            for b, dim in branch_dims.items()
        })
        
        # Cross-modal attention
        self.attn = nn.Sequential(
            nn.Linear(embed_dim * len(branch_dims), 32),
            nn.Tanh(),
            nn.Linear(32, len(branch_dims)),
            nn.Softmax(dim=-1),
        )
        
        # Prediction head
        fused_dim = embed_dim * len(branch_dims)
        self.head = nn.Sequential(
            nn.Linear(fused_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x_dict: Dict[str, torch.Tensor]) -> Tuple[torch.Tensor, torch.Tensor]:
        embeds = [self.encoders[b](x_dict[b]) for b in self.branch_names]
        concat_emb = torch.cat(embeds, dim=-1)
        weights = self.attn(concat_emb)
        # Weighted branch representations
        weighted_embeds = [embeds[i] * weights[:, i:i+1] for i in range(len(embeds))]
        fused = torch.cat(weighted_embeds, dim=-1)
        pred = self.head(fused).squeeze(-1)
        return pred, weights


def train_and_evaluate_observational_models(
    csv_path: str = "data/observational/observational_kharif_rice.csv",
    out_dir: str = "experiments/observational_results",
):
    os.makedirs(out_dir, exist_ok=True)
    
    logger.info("Loading observational dataset from %s", csv_path)
    df = pd.read_csv(csv_path)

    # 1. Chronological splitting
    train_df = df[df["crop_year"] <= 2010].copy()
    val_df = df[df["crop_year"].isin([2011, 2012])].copy()
    test_df = df[df["crop_year"] >= 2013].copy()

    logger.info("Split counts: Train=%d (2000-2010), Val=%d (2011-2012), Test=%d (2013-2014)",
                len(train_df), len(val_df), len(test_df))

    # 2. Strict scaling fit on Train only
    scaler = StandardScaler()
    X_train_flat = scaler.fit_transform(train_df[ALL_FEATURES])
    X_val_flat = scaler.transform(val_df[ALL_FEATURES])
    X_test_flat = scaler.transform(test_df[ALL_FEATURES])

    y_train = train_df["yield_tonnes_per_ha"].values
    y_val = val_df["yield_tonnes_per_ha"].values
    y_test = test_df["yield_tonnes_per_ha"].values

    # Branch-specific matrices
    branch_scalers = {}
    X_train_dict, X_val_dict, X_test_dict = {}, {}, {}
    for b, cols in FEATURE_GROUPS.items():
        s = StandardScaler()
        X_train_dict[b] = s.fit_transform(train_df[cols])
        X_val_dict[b] = s.transform(val_df[cols])
        X_test_dict[b] = s.transform(test_df[cols])
        branch_scalers[b] = s

    results = {}

    # MODEL 1: Naive Mean Baseline
    y_pred_naive = np.full_like(y_test, np.mean(y_train))
    results["Naive_Historical_Mean"] = {
        "model_name": "Naive Historical Mean Baseline",
        "mae": round(float(mean_absolute_error(y_test, y_pred_naive)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred_naive))), 4),
        "r2": round(float(r2_score(y_test, y_pred_naive)), 4),
    }

    # MODEL 2: Linear Regression (Ridge)
    ridge = Ridge(alpha=10.0, random_state=42)
    ridge.fit(X_train_flat, y_train)
    y_pred_ridge = ridge.predict(X_test_flat)
    results["Linear_Regression_Ridge"] = {
        "model_name": "Linear Regression (Ridge)",
        "mae": round(float(mean_absolute_error(y_test, y_pred_ridge)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred_ridge))), 4),
        "r2": round(float(r2_score(y_test, y_pred_ridge)), 4),
    }

    # MODEL 3: Random Forest
    rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    rf.fit(X_train_flat, y_train)
    y_pred_rf = rf.predict(X_test_flat)
    results["Random_Forest"] = {
        "model_name": "Random Forest Regressor",
        "mae": round(float(mean_absolute_error(y_test, y_pred_rf)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred_rf))), 4),
        "r2": round(float(r2_score(y_test, y_pred_rf)), 4),
    }

    # MODEL 4: XGBoost Regressor
    model_xgb = xgb.XGBRegressor(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
    )
    model_xgb.fit(X_train_flat, y_train, eval_set=[(X_val_flat, y_val)], verbose=False)
    y_pred_xgb = model_xgb.predict(X_test_flat)
    results["XGBoost"] = {
        "model_name": "XGBoost Regressor (Observational)",
        "mae": round(float(mean_absolute_error(y_test, y_pred_xgb)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred_xgb))), 4),
        "r2": round(float(r2_score(y_test, y_pred_xgb)), 4),
    }

    # MODEL 5: ClimateRice-FusionNet (PyTorch)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    branch_dims = {b: len(cols) for b, cols in FEATURE_GROUPS.items()}
    net = ObservationalFusionNet(branch_dims=branch_dims, embed_dim=16, dropout=0.20).to(device)

    optimizer = torch.optim.AdamW(net.parameters(), lr=0.005, weight_decay=1e-4)
    criterion = nn.HuberLoss(delta=0.5)

    # Convert tensors
    t_train_dict = {b: torch.tensor(v, dtype=torch.float32).to(device) for b, v in X_train_dict.items()}
    t_val_dict = {b: torch.tensor(v, dtype=torch.float32).to(device) for b, v in X_val_dict.items()}
    t_test_dict = {b: torch.tensor(v, dtype=torch.float32).to(device) for b, v in X_test_dict.items()}

    t_y_train = torch.tensor(y_train, dtype=torch.float32).to(device)
    t_y_val = torch.tensor(y_val, dtype=torch.float32).to(device)

    best_val_loss = float("inf")
    best_weights = None

    for epoch in range(250):
        net.train()
        optimizer.zero_grad()
        preds, _ = net(t_train_dict)
        loss = criterion(preds, t_y_train)
        loss.backward()
        optimizer.step()

        net.eval()
        with torch.no_grad():
            v_preds, _ = net(t_val_dict)
            v_loss = criterion(v_preds, t_y_val).item()
            if v_loss < best_val_loss:
                best_val_loss = v_loss
                best_weights = {k: v.cpu().clone() for k, v in net.state_dict().items()}

    if best_weights is not None:
        net.load_state_dict({k: v.to(device) for k, v in best_weights.items()})

    # MC Dropout inference on test set (50 passes)
    net.train()  # Keep dropout active for MC sampling
    mc_preds = []
    with torch.no_grad():
        for _ in range(50):
            p, _ = net(t_test_dict)
            mc_preds.append(p.cpu().numpy())

    mc_preds_arr = np.array(mc_preds)  # [50, N_test]
    mean_mc_pred = np.mean(mc_preds_arr, axis=0)
    std_mc_pred = np.std(mc_preds_arr, axis=0)

    # Calculate empirical coverage of mean +- 1.05 * std
    covered = 0
    for i in range(len(y_test)):
        low = mean_mc_pred[i] - 1.05 * std_mc_pred[i]
        high = mean_mc_pred[i] + 1.05 * std_mc_pred[i]
        if low <= y_test[i] <= high:
            covered += 1
    coverage_pct = round((covered / len(y_test)) * 100.0, 2)

    results["ClimateRice_FusionNet"] = {
        "model_name": "ClimateRice-FusionNet (Observational)",
        "mae": round(float(mean_absolute_error(y_test, mean_mc_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, mean_mc_pred))), 4),
        "r2": round(float(r2_score(y_test, mean_mc_pred)), 4),
        "mc_dropout_empirical_coverage_pct": coverage_pct,
        "n_covered": f"{covered}/{len(y_test)}",
    }

    # Save artifacts
    results_path = os.path.join(out_dir, "observational_model_evaluation.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    # Save trained observational models
    joblib.dump(model_xgb, os.path.join(out_dir, "observational_xgboost.joblib"))
    joblib.dump(scaler, os.path.join(out_dir, "observational_scaler.joblib"))
    torch.save(net.state_dict(), os.path.join(out_dir, "observational_fusion_net.pt"))

    logger.info("==================================================")
    logger.info(" Observational Model Evaluation Results (Test N=%d)", len(y_test))
    logger.info("==================================================")
    for k, v in results.items():
        logger.info("%-30s | MAE: %.4f | RMSE: %.4f | R²: %.4f", v["model_name"], v["mae"], v["rmse"], v["r2"])
    logger.info("==================================================")
    logger.info("Saved evaluation results to %s", results_path)

    return results


if __name__ == "__main__":
    train_and_evaluate_observational_models()
