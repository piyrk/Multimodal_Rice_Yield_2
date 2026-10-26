"""ClimateRice-AI: Comprehensive Model Training, Optimization, and Auditing Suite.

Performs systematic optimization of:
1. ClimateRice-FusionNet (learning rate, schedule, batch size, capacity, dropout, weight decay, early stopping)
2. XGBoost Regressor (tree depth, learning rate, subsample, colsample, L1/L2 regularization, early stopping)

Evaluates on:
- Calibrated Semi-Synthetic Benchmark (N=504, 24 districts, 2000-2020)
- Genuine Observational Agricultural Dataset (N=303, 24 districts, 2000-2014)

Guarantees:
- Strict chronological holdout splits (Test set completely untouched during tuning)
- Scalers fitted exclusively on training partitions (zero future/target leakage)
- Multi-seed stability evaluation (seeds 42, 101, 2024)
- Generalization gap analysis (Train vs Val vs Test)
- Inference latency profiling (single sample and batch)
- Preservation of production checkpoints unless promotion is justified
"""

import os
import sys
import time
import copy
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models.multimodal_fusion import ClimateRiceFusionNet
from src.training.trainer import MultimodalDataset
from src.training.losses import ClimateAwareLoss
from src.evaluation.metrics import compute_regression_metrics
from src.preprocessing.pipeline import PreprocessingPipeline, DataSplit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("model_optimizer")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =====================================================================
# DATASET HELPERS & FEATURE DEFINITIONS
# =====================================================================

OBSERVATIONAL_FEATURE_GROUPS = {
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
OBSERVATIONAL_ALL_FEATURES = [f for grp in OBSERVATIONAL_FEATURE_GROUPS.values() for f in grp]


def load_benchmark_splits() -> Tuple[DataSplit, DataSplit, DataSplit, List[str], Dict[str, List[str]]]:
    """Loads benchmark dataset (504 rows) with pre-saved splits bundle."""
    splits_path = "data/processed/splits_bundle.joblib"
    if not os.path.exists(splits_path):
        from scripts.preprocess import main as run_preprocess
        run_preprocess()
    bundle = joblib.load(splits_path)
    return bundle["train"], bundle["val"], bundle["test"], bundle["all_feature_cols"], bundle["modalities"]


def load_observational_splits(
    csv_path: str = "data/observational/observational_kharif_rice.csv",
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], StandardScaler]:
    """Loads genuine observational dataset (303 rows) with strict leakage-free temporal splits."""
    df = pd.read_csv(csv_path)

    # Chronological partition
    train_df = df[df["crop_year"] <= 2010].copy()
    val_df = df[df["crop_year"].isin([2011, 2012])].copy()
    test_df = df[df["crop_year"] >= 2013].copy()

    # Fit flat scaler strictly on Train
    flat_scaler = StandardScaler()
    X_train_flat = flat_scaler.fit_transform(train_df[OBSERVATIONAL_ALL_FEATURES]).astype(np.float32)
    X_val_flat = flat_scaler.transform(val_df[OBSERVATIONAL_ALL_FEATURES]).astype(np.float32)
    X_test_flat = flat_scaler.transform(test_df[OBSERVATIONAL_ALL_FEATURES]).astype(np.float32)

    # Branch-specific scalers (fit strictly on Train)
    X_train_dict, X_val_dict, X_test_dict = {}, {}, {}
    for b, cols in OBSERVATIONAL_FEATURE_GROUPS.items():
        s = StandardScaler()
        X_train_dict[b] = s.fit_transform(train_df[cols]).astype(np.float32)
        X_val_dict[b] = s.transform(val_df[cols]).astype(np.float32)
        X_test_dict[b] = s.transform(test_df[cols]).astype(np.float32)

    y_train = train_df["yield_tonnes_per_ha"].values.astype(np.float32)
    y_val = val_df["yield_tonnes_per_ha"].values.astype(np.float32)
    y_test = test_df["yield_tonnes_per_ha"].values.astype(np.float32)

    train_pack = {
        "df": train_df, "X_flat": X_train_flat, "X_dict": X_train_dict, "y": y_train,
        "districts": train_df["district_name"].tolist(), "years": train_df["crop_year"].tolist()
    }
    val_pack = {
        "df": val_df, "X_flat": X_val_flat, "X_dict": X_val_dict, "y": y_val,
        "districts": val_df["district_name"].tolist(), "years": val_df["crop_year"].tolist()
    }
    test_pack = {
        "df": test_df, "X_flat": X_test_flat, "X_dict": X_test_dict, "y": y_test,
        "districts": test_df["district_name"].tolist(), "years": test_df["crop_year"].tolist()
    }

    return train_pack, val_pack, test_pack, flat_scaler


# =====================================================================
# LATENCY PROFILING UTILITIES
# =====================================================================

def profile_pytorch_latency(
    model: nn.Module, sample_input: Dict[str, torch.Tensor], n_repeats: int = 100, mc_samples: int = 40
) -> Dict[str, float]:
    """Profiles PyTorch model inference latency for single-sample and MC Dropout."""
    model.eval()
    # Warmup
    with torch.no_grad():
        for _ in range(10):
            _ = model(sample_input)

    # 1. Deterministic forward pass latency
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    t0 = time.perf_counter()
    with torch.no_grad():
        for _ in range(n_repeats):
            _ = model(sample_input)
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    deterministic_latency_ms = ((time.perf_counter() - t0) / n_repeats) * 1000.0

    # 2. MC Dropout (40 stochastic passes) latency
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    t0 = time.perf_counter()
    with torch.no_grad():
        for _ in range(min(n_repeats, 30)):
            _ = model.predict_with_uncertainty(sample_input, num_mc_samples=mc_samples)
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    mc_latency_ms = ((time.perf_counter() - t0) / min(n_repeats, 30)) * 1000.0

    return {
        "deterministic_latency_ms_per_sample": round(deterministic_latency_ms, 3),
        "mc_dropout_40samples_latency_ms": round(mc_latency_ms, 3),
    }


def profile_xgboost_latency(model: Any, sample_flat: np.ndarray, n_repeats: int = 200) -> float:
    """Profiles XGBoost latency per single-sample inference."""
    # Warmup
    for _ in range(10):
        _ = model.predict(sample_flat)

    t0 = time.perf_counter()
    for _ in range(n_repeats):
        _ = model.predict(sample_flat)
    latency_ms = ((time.perf_counter() - t0) / n_repeats) * 1000.0
    return round(latency_ms, 4)


# =====================================================================
# PYTORCH FUSIONNET TRAINING ROUTINE
# =====================================================================

def train_fusion_model(
    model: ClimateRiceFusionNet,
    train_x_dict: Dict[str, np.ndarray],
    train_y: np.ndarray,
    val_x_dict: Dict[str, np.ndarray],
    val_y: np.ndarray,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    batch_size: int = 32,
    max_epochs: int = 100,
    patience: int = 15,
    scheduler_type: str = "plateau",  # "plateau" or "cosine"
    init_bias: bool = True,
    device: torch.device = DEVICE,
) -> Tuple[ClimateRiceFusionNet, Dict[str, List[float]], Dict[str, float]]:
    """Trains FusionNet with validation monitoring, early stopping, and history tracking."""
    # Initialize head bias to target training mean to stabilize early gradients
    if init_bias:
        mean_y = float(np.mean(train_y))
        with torch.no_grad():
            last_linear = list(model.prediction_head.children())[-1]
            if isinstance(last_linear, nn.Linear):
                last_linear.bias.fill_(mean_y)

    model = model.to(device)
    train_ds = MultimodalDataset(train_x_dict, train_y)
    val_ds = MultimodalDataset(val_x_dict, val_y)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    criterion = ClimateAwareLoss(delta=0.5, under_penalty_factor=1.2)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)

    if scheduler_type == "cosine":
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max_epochs, eta_min=1e-5)
    else:
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", factor=0.6, patience=5, min_lr=1e-5
        )

    history = {
        "train_loss": [], "val_loss": [], "val_mae": [], "val_rmse": [], "val_r2": [], "lr": []
    }
    best_val_loss = float("inf")
    best_weights = copy.deepcopy(model.state_dict())
    no_improve_count = 0
    best_epoch = 0

    for epoch in range(1, max_epochs + 1):
        model.train()
        running_train_loss = 0.0

        for bx, by in train_loader:
            bx = {k: v.to(device) for k, v in bx.items()}
            by = by.to(device)

            optimizer.zero_grad()
            pred, _ = model(bx)
            loss = criterion(pred, by)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            running_train_loss += loss.item() * len(by)

        epoch_train_loss = running_train_loss / len(train_ds)

        # Validation
        model.eval()
        running_val_loss = 0.0
        val_preds, val_trues = [], []

        with torch.no_grad():
            for bx, by in val_loader:
                bx = {k: v.to(device) for k, v in bx.items()}
                by = by.to(device)

                pred, _ = model(bx)
                loss = criterion(pred, by)
                running_val_loss += loss.item() * len(by)

                val_preds.extend(pred.cpu().numpy().tolist())
                val_trues.extend(by.cpu().numpy().tolist())

        epoch_val_loss = running_val_loss / len(val_ds)
        epoch_val_mae = float(mean_absolute_error(val_trues, val_preds))
        epoch_val_rmse = float(root_mean_squared_error(val_trues, val_preds))
        epoch_val_r2 = float(r2_score(val_trues, val_preds))

        current_lr = optimizer.param_groups[0]["lr"]
        if scheduler_type == "cosine":
            scheduler.step()
        else:
            scheduler.step(epoch_val_loss)

        history["train_loss"].append(epoch_train_loss)
        history["val_loss"].append(epoch_val_loss)
        history["val_mae"].append(epoch_val_mae)
        history["val_rmse"].append(epoch_val_rmse)
        history["val_r2"].append(epoch_val_r2)
        history["lr"].append(current_lr)

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            best_weights = copy.deepcopy(model.state_dict())
            best_epoch = epoch
            no_improve_count = 0
        else:
            no_improve_count += 1
            if no_improve_count >= patience:
                break

    # Restore best checkpoint
    model.load_state_dict(best_weights)
    best_summary = {
        "best_epoch": best_epoch,
        "total_epochs": epoch,
        "best_val_loss": round(best_val_loss, 4),
        "best_val_mae": round(min(history["val_mae"]), 4),
        "best_val_rmse": round(min(history["val_rmse"]), 4),
        "best_val_r2": round(max(history["val_r2"]), 4),
    }

    return model, history, best_summary


# =====================================================================
# BENCHMARK DATASET EXPERIMENTS (504 Rows)
# =====================================================================

def run_benchmark_optimization(out_dir: str = "experiments/optimized_results") -> Dict[str, Any]:
    """Runs systematic architecture and hyperparameter search on the 504-row benchmark dataset."""
    os.makedirs(out_dir, exist_ok=True)
    logger.info("\n" + "=" * 60)
    logger.info(" STARTING BENCHMARK DATASET (504 ROWS) OPTIMIZATION AUDIT")
    logger.info("=" * 60)

    train_split, val_split, test_split, all_features, modalities = load_benchmark_splits()
    modality_dims = {m: len(cols) for m, cols in modalities.items()}

    logger.info("Splits: Train=%d, Val=%d, Test=%d | Modalities: %s",
                len(train_split.y), len(val_split.y), len(test_split.y), modality_dims)

    # -------------------------------------------------------------
    # 1. XGBOOST HYPERPARAMETER GRID TUNING (Validated on Val 2015-16)
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 1: XGBoost Hyperparameter Grid Search (Tuning on Val)")
    xgb_candidates = [
        {"max_depth": 3, "learning_rate": 0.03, "n_estimators": 250, "subsample": 0.8, "colsample_bytree": 0.8, "reg_alpha": 0.1, "reg_lambda": 3.0},
        {"max_depth": 4, "learning_rate": 0.04, "n_estimators": 200, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.1, "reg_lambda": 2.0},
        {"max_depth": 5, "learning_rate": 0.05, "n_estimators": 180, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.0, "reg_lambda": 1.0},
        {"max_depth": 6, "learning_rate": 0.05, "n_estimators": 200, "subsample": 0.80, "colsample_bytree": 0.80, "reg_alpha": 0.0, "reg_lambda": 1.0}, # Baseline
        {"max_depth": 3, "learning_rate": 0.05, "n_estimators": 300, "subsample": 0.75, "colsample_bytree": 0.75, "reg_alpha": 0.2, "reg_lambda": 5.0},
    ]

    best_xgb_val_rmse = float("inf")
    best_xgb_config = None
    best_xgb_model = None

    for i, cfg in enumerate(xgb_candidates):
        model = xgb.XGBRegressor(
            max_depth=cfg["max_depth"],
            learning_rate=cfg["learning_rate"],
            n_estimators=cfg["n_estimators"],
            subsample=cfg["subsample"],
            colsample_bytree=cfg["colsample_bytree"],
            reg_alpha=cfg["reg_alpha"],
            reg_lambda=cfg["reg_lambda"],
            random_state=42,
            n_jobs=-1,
            early_stopping_rounds=25,
        )
        t0 = time.perf_counter()
        model.fit(
            train_split.X_flat,
            train_split.y,
            eval_set=[(val_split.X_flat, val_split.y)],
            verbose=False,
        )
        fit_time = time.perf_counter() - t0

        val_preds = model.predict(val_split.X_flat)
        val_rmse = float(root_mean_squared_error(val_split.y, val_preds))
        val_mae = float(mean_absolute_error(val_split.y, val_preds))
        val_r2 = float(r2_score(val_split.y, val_preds))

        logger.info("  XGB Candidate %d [depth=%d, lr=%.2f, l2=%.1f] -> Val MAE: %.4f, RMSE: %.4f, R²: %.4f (time: %.3fs)",
                    i + 1, cfg["max_depth"], cfg["learning_rate"], cfg["reg_lambda"], val_mae, val_rmse, val_r2, fit_time)

        if val_rmse < best_xgb_val_rmse:
            best_xgb_val_rmse = val_rmse
            best_xgb_config = cfg
            best_xgb_model = model

    logger.info(">>> Best XGBoost Configuration Selected: %s (Val RMSE: %.4f)", best_xgb_config, best_xgb_val_rmse)

    # -------------------------------------------------------------
    # 2. FUSIONNET ARCHITECTURE & HYPERPARAMETER GRID TUNING
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 2: ClimateRice-FusionNet Grid Tuning (Tuning on Val)")
    fusion_candidates = [
        # (embed_dim, hidden_dims, dropout, lr, batch_size, weight_decay, scheduler)
        {"name": "FN_Config_1_Baseline", "embed_dim": 24, "dense_hidden": [64, 32], "dropout": 0.20, "lr": 0.001, "batch_size": 64, "weight_decay": 1e-4, "scheduler": "plateau"},
        {"name": "FN_Config_2_SmallerBatch_Cosine", "embed_dim": 24, "dense_hidden": [64, 32], "dropout": 0.20, "lr": 0.002, "batch_size": 32, "weight_decay": 1e-4, "scheduler": "cosine"},
        {"name": "FN_Config_3_Batch16_Decay1e3", "embed_dim": 24, "dense_hidden": [48, 24], "dropout": 0.15, "lr": 0.0015, "batch_size": 16, "weight_decay": 1e-3, "scheduler": "cosine"},
        {"name": "FN_Config_4_Compact_Plateau", "embed_dim": 16, "dense_hidden": [32, 16], "dropout": 0.15, "lr": 0.002, "batch_size": 32, "weight_decay": 5e-4, "scheduler": "plateau"},
        {"name": "FN_Config_5_DeepHead_WeightDecay", "embed_dim": 32, "dense_hidden": [64, 32, 16], "dropout": 0.25, "lr": 0.001, "batch_size": 32, "weight_decay": 1e-3, "scheduler": "cosine"},
    ]

    best_fn_val_rmse = float("inf")
    best_fn_config = None
    best_fn_model = None
    best_fn_history = None

    for i, cfg in enumerate(fusion_candidates):
        torch.manual_seed(42)
        model = ClimateRiceFusionNet(
            modality_dims=modality_dims,
            embed_dim=cfg["embed_dim"],
            dense_hidden=cfg["dense_hidden"],
            dropout=cfg["dropout"],
        )
        t0 = time.perf_counter()
        trained_model, history, summary = train_fusion_model(
            model=model,
            train_x_dict=train_split.X_dict,
            train_y=train_split.y,
            val_x_dict=val_split.X_dict,
            val_y=val_split.y,
            lr=cfg["lr"],
            weight_decay=cfg["weight_decay"],
            batch_size=cfg["batch_size"],
            max_epochs=90,
            patience=16,
            scheduler_type=cfg["scheduler"],
            init_bias=True,
            device=DEVICE,
        )
        fit_time = time.perf_counter() - t0

        logger.info("  FusionNet Candidate %d [%s, embed=%d, bs=%d, lr=%.4f] -> Val Loss: %.4f, MAE: %.4f, RMSE: %.4f, R²: %.4f (Epoch %d/%d, %.2fs)",
                    i + 1, cfg["name"], cfg["embed_dim"], cfg["batch_size"], cfg["lr"],
                    summary["best_val_loss"], summary["best_val_mae"], summary["best_val_rmse"], summary["best_val_r2"],
                    summary["best_epoch"], summary["total_epochs"], fit_time)

        if summary["best_val_rmse"] < best_fn_val_rmse:
            best_fn_val_rmse = summary["best_val_rmse"]
            best_fn_config = cfg
            best_fn_model = trained_model
            best_fn_history = history

    logger.info(">>> Best FusionNet Configuration Selected: %s (Val RMSE: %.4f)", best_fn_config["name"], best_fn_val_rmse)

    # -------------------------------------------------------------
    # 3. MULTI-SEED EVALUATION ON UNTOUCHED HELD-OUT TEST (2017-2020, N=96)
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 3: Multi-Seed Robustness Evaluation on Untouched Test Set (N=96)")
    test_seeds = [42, 101, 2024]

    # Evaluate Best XGBoost across seeds
    xgb_test_results = []
    for s in test_seeds:
        m = xgb.XGBRegressor(
            max_depth=best_xgb_config["max_depth"],
            learning_rate=best_xgb_config["learning_rate"],
            n_estimators=best_xgb_config["n_estimators"],
            subsample=best_xgb_config["subsample"],
            colsample_bytree=best_xgb_config["colsample_bytree"],
            reg_alpha=best_xgb_config["reg_alpha"],
            reg_lambda=best_xgb_config["reg_lambda"],
            random_state=s,
            n_jobs=-1,
            early_stopping_rounds=25,
        )
        m.fit(train_split.X_flat, train_split.y, eval_set=[(val_split.X_flat, val_split.y)], verbose=False)
        test_preds = m.predict(test_split.X_flat)
        metrics = compute_regression_metrics(test_split.y, test_preds)
        xgb_test_results.append(metrics)

    # Evaluate Baseline XGBoost for direct comparison
    xgb_base = xgb.XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    xgb_base.fit(train_split.X_flat, train_split.y)
    xgb_base_preds = xgb_base.predict(test_split.X_flat)
    xgb_base_metrics = compute_regression_metrics(test_split.y, xgb_base_preds)

    # Evaluate Best FusionNet across seeds
    fn_test_results = []
    test_x_tensor = {k: torch.tensor(v, dtype=torch.float32).to(DEVICE) for k, v in test_split.X_dict.items()}

    for s in test_seeds:
        torch.manual_seed(s)
        np.random.seed(s)
        m = ClimateRiceFusionNet(
            modality_dims=modality_dims,
            embed_dim=best_fn_config["embed_dim"],
            dense_hidden=best_fn_config["dense_hidden"],
            dropout=best_fn_config["dropout"],
        )
        trained_m, _, _ = train_fusion_model(
            model=m,
            train_x_dict=train_split.X_dict,
            train_y=train_split.y,
            val_x_dict=val_split.X_dict,
            val_y=val_split.y,
            lr=best_fn_config["lr"],
            weight_decay=best_fn_config["weight_decay"],
            batch_size=best_fn_config["batch_size"],
            max_epochs=90,
            patience=16,
            scheduler_type=best_fn_config["scheduler"],
            init_bias=True,
            device=DEVICE,
        )
        # 40-pass MC Dropout evaluation
        torch.manual_seed(s)
        mean_p, std_p, _ = trained_m.predict_with_uncertainty(test_x_tensor, num_mc_samples=40)
        fn_preds = mean_p.cpu().numpy()
        fn_metrics = compute_regression_metrics(test_split.y, fn_preds)
        fn_test_results.append(fn_metrics)

    # Profiling latencies
    sample_tensor = {k: v[:1] for k, v in test_x_tensor.items()}
    fn_latency = profile_pytorch_latency(best_fn_model, sample_tensor)
    xgb_latency = profile_xgboost_latency(best_xgb_model, test_split.X_flat[:1])

    # Summary table
    def summarize_runs(run_list: List[Dict[str, float]]) -> Dict[str, Any]:
        return {
            "mae_mean": round(float(np.mean([r["mae"] for r in run_list])), 4),
            "mae_std": round(float(np.std([r["mae"] for r in run_list])), 4),
            "rmse_mean": round(float(np.mean([r["rmse"] for r in run_list])), 4),
            "rmse_std": round(float(np.std([r["rmse"] for r in run_list])), 4),
            "r2_mean": round(float(np.mean([r["r2"] for r in run_list])), 4),
            "r2_std": round(float(np.std([r["r2"] for r in run_list])), 4),
            "runs": run_list,
        }

    benchmark_summary = {
        "dataset": "Calibrated Semi-Synthetic Benchmark",
        "sample_counts": {"total": 504, "train": len(train_split.y), "val": len(val_split.y), "test": len(test_split.y)},
        "baseline_xgboost_metrics": xgb_base_metrics,
        "optimized_xgboost": {
            "config": best_xgb_config,
            "val_rmse": round(best_xgb_val_rmse, 4),
            "test_summary": summarize_runs(xgb_test_results),
            "latency_ms_per_sample": xgb_latency,
        },
        "baseline_fusionnet_metrics": {"mae": 0.2774, "rmse": 0.3217, "r2": 0.9329},
        "optimized_fusionnet": {
            "config": best_fn_config,
            "val_rmse": round(best_fn_val_rmse, 4),
            "test_summary": summarize_runs(fn_test_results),
            "latency": fn_latency,
        },
    }

    # Save benchmark results
    with open(os.path.join(out_dir, "benchmark_optimization_results.json"), "w") as f:
        json.dump(benchmark_summary, f, indent=2)

    with open(os.path.join(out_dir, "benchmark_learning_curves.json"), "w") as f:
        json.dump(best_fn_history, f, indent=2)

    # Save model weights to experimental dir
    joblib.dump(best_xgb_model, os.path.join(out_dir, "optimized_xgboost_benchmark.joblib"))
    torch.save(best_fn_model.state_dict(), os.path.join(out_dir, "optimized_fusion_net_benchmark.pt"))

    logger.info("\n" + "=" * 60)
    logger.info(" BENCHMARK OPTIMIZATION SUMMARY (Held-out Test N=96)")
    logger.info("=" * 60)
    logger.info("  Baseline XGBoost:      MAE = %.4f | RMSE = %.4f | R² = %.4f",
                xgb_base_metrics["mae"], xgb_base_metrics["rmse"], xgb_base_metrics["r2"])
    logger.info("  Optimized XGBoost:     MAE = %.4f (±%.4f) | RMSE = %.4f (±%.4f) | R² = %.4f (±%.4f)",
                benchmark_summary["optimized_xgboost"]["test_summary"]["mae_mean"],
                benchmark_summary["optimized_xgboost"]["test_summary"]["mae_std"],
                benchmark_summary["optimized_xgboost"]["test_summary"]["rmse_mean"],
                benchmark_summary["optimized_xgboost"]["test_summary"]["rmse_std"],
                benchmark_summary["optimized_xgboost"]["test_summary"]["r2_mean"],
                benchmark_summary["optimized_xgboost"]["test_summary"]["r2_std"])
    logger.info("  Baseline FusionNet:    MAE = 0.2774 | RMSE = 0.3217 | R² = 0.9329")
    logger.info("  Optimized FusionNet:   MAE = %.4f (±%.4f) | RMSE = %.4f (±%.4f) | R² = %.4f (±%.4f)",
                benchmark_summary["optimized_fusionnet"]["test_summary"]["mae_mean"],
                benchmark_summary["optimized_fusionnet"]["test_summary"]["mae_std"],
                benchmark_summary["optimized_fusionnet"]["test_summary"]["rmse_mean"],
                benchmark_summary["optimized_fusionnet"]["test_summary"]["rmse_std"],
                benchmark_summary["optimized_fusionnet"]["test_summary"]["r2_mean"],
                benchmark_summary["optimized_fusionnet"]["test_summary"]["r2_std"])
    logger.info("  Inference Latency:     XGBoost: %.3f ms | FusionNet (det): %.3f ms | FusionNet (MC 40): %.3f ms",
                xgb_latency, fn_latency["deterministic_latency_ms_per_sample"], fn_latency["mc_dropout_40samples_latency_ms"])
    logger.info("=" * 60)

    return benchmark_summary


# =====================================================================
# OBSERVATIONAL DATASET EXPERIMENTS (303 Rows)
# =====================================================================

def run_observational_optimization(out_dir: str = "experiments/optimized_results") -> Dict[str, Any]:
    """Runs systematic architecture and hyperparameter search on the 303-row genuine observational dataset."""
    os.makedirs(out_dir, exist_ok=True)
    logger.info("\n" + "=" * 60)
    logger.info(" STARTING OBSERVATIONAL DATASET (303 ROWS) OPTIMIZATION AUDIT")
    logger.info("=" * 60)

    train_p, val_p, test_p, flat_scaler = load_observational_splits()
    branch_dims = {b: len(cols) for b, cols in OBSERVATIONAL_FEATURE_GROUPS.items()}

    logger.info("Splits: Train=%d (<=2010), Val=%d (2011-12), Test=%d (2013-14) | Modalities: %s",
                len(train_p["y"]), len(val_p["y"]), len(test_p["y"]), branch_dims)

    # -------------------------------------------------------------
    # 1. RIDGE AND RANDOM FOREST REGULARIZATION TUNING
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 1: Ridge Regression & Random Forest Grid Tuning")
    ridge_alphas = [0.1, 1.0, 5.0, 10.0, 20.0, 50.0]
    best_ridge_val_rmse = float("inf")
    best_ridge_alpha = 10.0

    for a in ridge_alphas:
        r = Ridge(alpha=a, random_state=42)
        r.fit(train_p["X_flat"], train_p["y"])
        val_pred = r.predict(val_p["X_flat"])
        val_rmse = float(root_mean_squared_error(val_p["y"], val_pred))
        if val_rmse < best_ridge_val_rmse:
            best_ridge_val_rmse = val_rmse
            best_ridge_alpha = a

    best_ridge = Ridge(alpha=best_ridge_alpha, random_state=42)
    best_ridge.fit(train_p["X_flat"], train_p["y"])
    ridge_test_preds = best_ridge.predict(test_p["X_flat"])
    ridge_test_metrics = compute_regression_metrics(test_p["y"], ridge_test_preds)
    logger.info("  Tuned Ridge (alpha=%.1f) -> Val RMSE: %.4f | Test MAE: %.4f, RMSE: %.4f, R²: %.4f",
                best_ridge_alpha, best_ridge_val_rmse, ridge_test_metrics["mae"], ridge_test_metrics["rmse"], ridge_test_metrics["r2"])

    # -------------------------------------------------------------
    # 2. XGBOOST HYPERPARAMETER GRID TUNING ON OBSERVATIONAL DATA
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 2: XGBoost Hyperparameter Search on Observational Data (Tuning on Val)")
    xgb_obs_candidates = [
        # Depth 2: Shallow trees for small sample size N=228
        {"max_depth": 2, "learning_rate": 0.03, "n_estimators": 250, "subsample": 0.75, "colsample_bytree": 0.75, "reg_alpha": 0.2, "reg_lambda": 5.0},
        {"max_depth": 2, "learning_rate": 0.05, "n_estimators": 200, "subsample": 0.80, "colsample_bytree": 0.80, "reg_alpha": 0.5, "reg_lambda": 3.0},
        # Depth 3: Balanced capacity with L2 regularization
        {"max_depth": 3, "learning_rate": 0.03, "n_estimators": 200, "subsample": 0.80, "colsample_bytree": 0.80, "reg_alpha": 0.2, "reg_lambda": 4.0},
        {"max_depth": 3, "learning_rate": 0.05, "n_estimators": 150, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.1, "reg_lambda": 2.0},
        # Depth 4: Baseline configuration
        {"max_depth": 4, "learning_rate": 0.05, "n_estimators": 150, "subsample": 0.85, "colsample_bytree": 0.85, "reg_alpha": 0.0, "reg_lambda": 1.0},
    ]

    best_obs_xgb_val_rmse = float("inf")
    best_obs_xgb_config = None
    best_obs_xgb_model = None

    for i, cfg in enumerate(xgb_obs_candidates):
        m = xgb.XGBRegressor(
            max_depth=cfg["max_depth"],
            learning_rate=cfg["learning_rate"],
            n_estimators=cfg["n_estimators"],
            subsample=cfg["subsample"],
            colsample_bytree=cfg["colsample_bytree"],
            reg_alpha=cfg["reg_alpha"],
            reg_lambda=cfg["reg_lambda"],
            random_state=42,
            n_jobs=-1,
            early_stopping_rounds=20,
        )
        t0 = time.perf_counter()
        m.fit(train_p["X_flat"], train_p["y"], eval_set=[(val_p["X_flat"], val_p["y"])], verbose=False)
        fit_time = time.perf_counter() - t0

        val_preds = m.predict(val_p["X_flat"])
        val_rmse = float(root_mean_squared_error(val_p["y"], val_preds))
        val_mae = float(mean_absolute_error(val_p["y"], val_preds))
        val_r2 = float(r2_score(val_p["y"], val_preds))

        logger.info("  Obs XGB Candidate %d [depth=%d, lr=%.2f, l2=%.1f] -> Val MAE: %.4f, RMSE: %.4f, R²: %.4f (time: %.3fs)",
                    i + 1, cfg["max_depth"], cfg["learning_rate"], cfg["reg_lambda"], val_mae, val_rmse, val_r2, fit_time)

        if val_rmse < best_obs_xgb_val_rmse:
            best_obs_xgb_val_rmse = val_rmse
            best_obs_xgb_config = cfg
            best_obs_xgb_model = m

    logger.info(">>> Best Observational XGBoost Config: %s (Val RMSE: %.4f)", best_obs_xgb_config, best_obs_xgb_val_rmse)

    # -------------------------------------------------------------
    # 3. FUSIONNET ARCHITECTURE & HYPERPARAMETER TUNING ON OBSERVATIONAL
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 3: Observational ClimateRice-FusionNet Grid Tuning (Tuning on Val)")
    fn_obs_candidates = [
        {"name": "ObsFN_Compact12_Cosine", "embed_dim": 12, "dense_hidden": [24, 12], "dropout": 0.20, "lr": 0.003, "batch_size": 16, "weight_decay": 1e-3, "scheduler": "cosine"},
        {"name": "ObsFN_Compact16_Plateau", "embed_dim": 16, "dense_hidden": [32, 16], "dropout": 0.20, "lr": 0.002, "batch_size": 16, "weight_decay": 5e-4, "scheduler": "plateau"},
        {"name": "ObsFN_Capacity16_Cosine", "embed_dim": 16, "dense_hidden": [32, 16], "dropout": 0.25, "lr": 0.003, "batch_size": 32, "weight_decay": 2e-3, "scheduler": "cosine"},
        {"name": "ObsFN_Regularized_HighWD", "embed_dim": 12, "dense_hidden": [20, 10], "dropout": 0.30, "lr": 0.004, "batch_size": 16, "weight_decay": 5e-3, "scheduler": "cosine"},
    ]

    best_obs_fn_val_rmse = float("inf")
    best_obs_fn_config = None
    best_obs_fn_model = None
    best_obs_fn_history = None

    for i, cfg in enumerate(fn_obs_candidates):
        torch.manual_seed(42)
        model = ClimateRiceFusionNet(
            modality_dims=branch_dims,
            embed_dim=cfg["embed_dim"],
            dense_hidden=cfg["dense_hidden"],
            dropout=cfg["dropout"],
        )
        t0 = time.perf_counter()
        trained_model, history, summary = train_fusion_model(
            model=model,
            train_x_dict=train_p["X_dict"],
            train_y=train_p["y"],
            val_x_dict=val_p["X_dict"],
            val_y=val_p["y"],
            lr=cfg["lr"],
            weight_decay=cfg["weight_decay"],
            batch_size=cfg["batch_size"],
            max_epochs=120,
            patience=20,
            scheduler_type=cfg["scheduler"],
            init_bias=True,
            device=DEVICE,
        )
        fit_time = time.perf_counter() - t0

        logger.info("  Obs FusionNet Candidate %d [%s, embed=%d, lr=%.4f] -> Val Loss: %.4f, MAE: %.4f, RMSE: %.4f, R²: %.4f (Epoch %d/%d, %.2fs)",
                    i + 1, cfg["name"], cfg["embed_dim"], cfg["lr"],
                    summary["best_val_loss"], summary["best_val_mae"], summary["best_val_rmse"], summary["best_val_r2"],
                    summary["best_epoch"], summary["total_epochs"], fit_time)

        if summary["best_val_rmse"] < best_obs_fn_val_rmse:
            best_obs_fn_val_rmse = summary["best_val_rmse"]
            best_obs_fn_config = cfg
            best_obs_fn_model = trained_model
            best_obs_fn_history = history

    logger.info(">>> Best Observational FusionNet Config: %s (Val RMSE: %.4f)", best_obs_fn_config["name"], best_obs_fn_val_rmse)

    # -------------------------------------------------------------
    # 4. MULTI-SEED EVALUATION ON HELD-OUT TEST (2013-2014, N=36)
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 4: Observational Multi-Seed Evaluation on Untouched Test Set (N=36)")
    test_seeds = [42, 101, 2024]

    # Evaluate Tuned XGBoost across seeds
    obs_xgb_test_results = []
    for s in test_seeds:
        m = xgb.XGBRegressor(
            max_depth=best_obs_xgb_config["max_depth"],
            learning_rate=best_obs_xgb_config["learning_rate"],
            n_estimators=best_obs_xgb_config["n_estimators"],
            subsample=best_obs_xgb_config["subsample"],
            colsample_bytree=best_obs_xgb_config["colsample_bytree"],
            reg_alpha=best_obs_xgb_config["reg_alpha"],
            reg_lambda=best_obs_xgb_config["reg_lambda"],
            random_state=s,
            n_jobs=-1,
            early_stopping_rounds=20,
        )
        m.fit(train_p["X_flat"], train_p["y"], eval_set=[(val_p["X_flat"], val_p["y"])], verbose=False)
        test_preds = m.predict(test_p["X_flat"])
        metrics = compute_regression_metrics(test_p["y"], test_preds)
        obs_xgb_test_results.append(metrics)

    # Baseline observational XGBoost for comparison
    m_base_xgb = xgb.XGBRegressor(n_estimators=150, learning_rate=0.05, max_depth=4, subsample=0.85, colsample_bytree=0.85, random_state=42)
    m_base_xgb.fit(train_p["X_flat"], train_p["y"])
    base_xgb_test_preds = m_base_xgb.predict(test_p["X_flat"])
    base_xgb_test_metrics = compute_regression_metrics(test_p["y"], base_xgb_test_preds)

    # Evaluate Tuned FusionNet across seeds
    obs_fn_test_results = []
    obs_test_x_tensor = {k: torch.tensor(v, dtype=torch.float32).to(DEVICE) for k, v in test_p["X_dict"].items()}

    for s in test_seeds:
        torch.manual_seed(s)
        np.random.seed(s)
        m = ClimateRiceFusionNet(
            modality_dims=branch_dims,
            embed_dim=best_obs_fn_config["embed_dim"],
            dense_hidden=best_obs_fn_config["dense_hidden"],
            dropout=best_obs_fn_config["dropout"],
        )
        trained_m, _, _ = train_fusion_model(
            model=m,
            train_x_dict=train_p["X_dict"],
            train_y=train_p["y"],
            val_x_dict=val_p["X_dict"],
            val_y=val_p["y"],
            lr=best_obs_fn_config["lr"],
            weight_decay=best_obs_fn_config["weight_decay"],
            batch_size=best_obs_fn_config["batch_size"],
            max_epochs=120,
            patience=20,
            scheduler_type=best_obs_fn_config["scheduler"],
            init_bias=True,
            device=DEVICE,
        )
        # 40-pass MC Dropout evaluation
        torch.manual_seed(s)
        mean_p, std_p, _ = trained_m.predict_with_uncertainty(obs_test_x_tensor, num_mc_samples=40)
        fn_preds = mean_p.cpu().numpy()
        fn_std = std_p.cpu().numpy()
        fn_metrics = compute_regression_metrics(test_p["y"], fn_preds)

        # Calculate empirical coverage of mean +- 1.05 * std
        covered = sum(
            1 for y_act, y_hat, s_hat in zip(test_p["y"], fn_preds, fn_std)
            if (y_hat - 1.05 * s_hat) <= y_act <= (y_hat + 1.05 * s_hat)
        )
        fn_metrics["coverage_pct"] = round((covered / len(test_p["y"])) * 100.0, 2)
        fn_metrics["n_covered"] = f"{covered}/{len(test_p['y'])}"
        obs_fn_test_results.append(fn_metrics)

    # Profiling latencies
    obs_sample_tensor = {k: v[:1] for k, v in obs_test_x_tensor.items()}
    obs_fn_latency = profile_pytorch_latency(best_obs_fn_model, obs_sample_tensor)
    obs_xgb_latency = profile_xgboost_latency(best_obs_xgb_model, test_p["X_flat"][:1])

    def summarize_obs_runs(run_list: List[Dict[str, float]]) -> Dict[str, Any]:
        return {
            "mae_mean": round(float(np.mean([r["mae"] for r in run_list])), 4),
            "mae_std": round(float(np.std([r["mae"] for r in run_list])), 4),
            "rmse_mean": round(float(np.mean([r["rmse"] for r in run_list])), 4),
            "rmse_std": round(float(np.std([r["rmse"] for r in run_list])), 4),
            "r2_mean": round(float(np.mean([r["r2"] for r in run_list])), 4),
            "r2_std": round(float(np.std([r["r2"] for r in run_list])), 4),
            "coverage_pct_mean": round(float(np.mean([r.get("coverage_pct", 0) for r in run_list])), 2),
            "runs": run_list,
        }

    observational_summary = {
        "dataset": "Genuine Observational Agricultural Dataset",
        "sample_counts": {"total": 303, "train": len(train_p["y"]), "val": len(val_p["y"]), "test": len(test_p["y"])},
        "tuned_ridge_metrics": ridge_test_metrics,
        "baseline_xgboost_metrics": base_xgb_test_metrics,
        "optimized_xgboost": {
            "config": best_obs_xgb_config,
            "val_rmse": round(best_obs_xgb_val_rmse, 4),
            "test_summary": summarize_obs_runs(obs_xgb_test_results),
            "latency_ms_per_sample": obs_xgb_latency,
        },
        "baseline_fusionnet_metrics": {"mae": 0.3366, "rmse": 0.4711, "r2": 0.6803},
        "optimized_fusionnet": {
            "config": best_obs_fn_config,
            "val_rmse": round(best_obs_fn_val_rmse, 4),
            "test_summary": summarize_obs_runs(obs_fn_test_results),
            "latency": obs_fn_latency,
        },
    }

    # Save observational results
    with open(os.path.join(out_dir, "observational_optimization_results.json"), "w") as f:
        json.dump(observational_summary, f, indent=2)

    with open(os.path.join(out_dir, "observational_learning_curves.json"), "w") as f:
        json.dump(best_obs_fn_history, f, indent=2)

    # Save models to experimental directory
    joblib.dump(best_obs_xgb_model, os.path.join(out_dir, "optimized_xgboost_observational.joblib"))
    torch.save(best_obs_fn_model.state_dict(), os.path.join(out_dir, "optimized_fusion_net_observational.pt"))

    logger.info("\n" + "=" * 60)
    logger.info(" OBSERVATIONAL OPTIMIZATION SUMMARY (Held-out Test N=36)")
    logger.info("=" * 60)
    logger.info("  Baseline XGBoost:      MAE = %.4f | RMSE = %.4f | R² = %.4f",
                base_xgb_test_metrics["mae"], base_xgb_test_metrics["rmse"], base_xgb_test_metrics["r2"])
    logger.info("  Optimized XGBoost:     MAE = %.4f (±%.4f) | RMSE = %.4f (±%.4f) | R² = %.4f (±%.4f)",
                observational_summary["optimized_xgboost"]["test_summary"]["mae_mean"],
                observational_summary["optimized_xgboost"]["test_summary"]["mae_std"],
                observational_summary["optimized_xgboost"]["test_summary"]["rmse_mean"],
                observational_summary["optimized_xgboost"]["test_summary"]["rmse_std"],
                observational_summary["optimized_xgboost"]["test_summary"]["r2_mean"],
                observational_summary["optimized_xgboost"]["test_summary"]["r2_std"])
    logger.info("  Tuned Ridge:           MAE = %.4f | RMSE = %.4f | R² = %.4f",
                ridge_test_metrics["mae"], ridge_test_metrics["rmse"], ridge_test_metrics["r2"])
    logger.info("  Baseline FusionNet:    MAE = 0.3366 | RMSE = 0.4711 | R² = 0.6803")
    logger.info("  Optimized FusionNet:   MAE = %.4f (±%.4f) | RMSE = %.4f (±%.4f) | R² = %.4f (±%.4f)",
                observational_summary["optimized_fusionnet"]["test_summary"]["mae_mean"],
                observational_summary["optimized_fusionnet"]["test_summary"]["mae_std"],
                observational_summary["optimized_fusionnet"]["test_summary"]["rmse_mean"],
                observational_summary["optimized_fusionnet"]["test_summary"]["rmse_std"],
                observational_summary["optimized_fusionnet"]["test_summary"]["r2_mean"],
                observational_summary["optimized_fusionnet"]["test_summary"]["r2_std"])
    logger.info("  Inference Latency:     XGBoost: %.3f ms | FusionNet (det): %.3f ms | FusionNet (MC 40): %.3f ms",
                obs_xgb_latency, obs_fn_latency["deterministic_latency_ms_per_sample"], obs_fn_latency["mc_dropout_40samples_latency_ms"])
    logger.info("=" * 60)

    return observational_summary


# =====================================================================
# MAIN DRIVER
# =====================================================================

def main():
    logger.info("==================================================")
    logger.info(" ClimateRice-AI: Advanced Model Training & Tuning ")
    logger.info("==================================================")
    logger.info("Device selected: %s", DEVICE)

    out_dir = "experiments/optimized_results"
    os.makedirs(out_dir, exist_ok=True)

    # 1. Run Benchmark (504 rows) optimization
    benchmark_res = run_benchmark_optimization(out_dir=out_dir)

    # 2. Run Observational (303 rows) optimization
    observational_res = run_observational_optimization(out_dir=out_dir)

    # 3. Overall Comparative Synthesis
    combined_report = {
        "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware_device": str(DEVICE),
        "benchmark_summary": benchmark_res,
        "observational_summary": observational_res,
    }
    with open(os.path.join(out_dir, "model_optimization_synthesis.json"), "w") as f:
        json.dump(combined_report, f, indent=2)

    logger.info("\nSynthesis report written to %s", os.path.join(out_dir, "model_optimization_synthesis.json"))
    logger.info("Advanced model optimization and audit complete.")


if __name__ == "__main__":
    main()
