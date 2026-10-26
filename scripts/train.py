"""Comprehensive Training Pipeline and Ablation Suite for ClimateRice-AI."""

from typing import Dict, Any, List, Tuple
import os
import sys
import json
import logging
import joblib
import numpy as np
import pandas as pd
import torch

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models.baselines import NaiveDistrictMeanBaseline, BaselineFactory
from src.models.mlp import FlatDeepMLP
from src.models.multimodal_fusion import ClimateRiceFusionNet
from src.training.trainer import ModelTrainer
from src.evaluation.metrics import compute_regression_metrics, evaluate_by_yield_bracket, evaluate_by_year
from src.evaluation.statistical_tests import compare_models_statistically
from src.explainability.shap_explainer import ClimateRiceExplainer
from src.preprocessing.pipeline import DataSplit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("==================================================")
    logger.info(" ClimateRice-AI: Model Training & Ablation Suite   ")
    logger.info("==================================================")

    # 1. Load Preprocessed Data Splits
    splits_path = "data/processed/splits_bundle.joblib"
    if not os.path.exists(splits_path):
        logger.info("Splits bundle not found. Triggering preprocessing...")
        from scripts.preprocess import main as run_preprocess
        run_preprocess()

    bundle = joblib.load(splits_path)
    train_split: DataSplit = bundle["train"]
    val_split: DataSplit = bundle["val"]
    test_split: DataSplit = bundle["test"]
    all_feature_cols: List[str] = bundle["all_feature_cols"]
    modalities: Dict[str, List[str]] = bundle["modalities"]

    logger.info("Loaded splits: Train=%d, Val=%d, Test=%d | Features=%d",
                len(train_split.y), len(val_split.y), len(test_split.y), len(all_feature_cols))

    trainer = ModelTrainer()
    benchmark_results: Dict[str, Any] = {}

    # ==============================================================
    # PHASE A: TRADITIONAL MACHINE LEARNING BASELINES (Full Features)
    # ==============================================================
    logger.info("\n--- Phase A: Training Traditional Baselines ---")

    # 1. Naive District Mean Baseline
    naive_model = NaiveDistrictMeanBaseline().fit(train_split.districts, train_split.y)
    naive_test_preds = naive_model.predict(test_split.districts)
    naive_metrics = compute_regression_metrics(test_split.y, naive_test_preds)
    benchmark_results["Naive_District_Mean"] = naive_metrics
    logger.info("Naive Baseline Test -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                naive_metrics["mae"], naive_metrics["rmse"], naive_metrics["r2"])

    # 2. Ridge Linear Regression
    ridge_model = BaselineFactory.get_ridge(alpha=1.0)
    ridge_model.fit(train_split.X_flat, train_split.y)
    ridge_test_preds = ridge_model.predict(test_split.X_flat)
    ridge_metrics = compute_regression_metrics(test_split.y, ridge_test_preds)
    benchmark_results["Ridge_Regression"] = ridge_metrics
    logger.info("Ridge Regression Test -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                ridge_metrics["mae"], ridge_metrics["rmse"], ridge_metrics["r2"])

    # 3. Random Forest Regressor
    rf_model = BaselineFactory.get_random_forest(n_estimators=150, max_depth=12, random_state=42)
    rf_model.fit(train_split.X_flat, train_split.y)
    rf_test_preds = rf_model.predict(test_split.X_flat)
    rf_metrics = compute_regression_metrics(test_split.y, rf_test_preds)
    benchmark_results["Random_Forest"] = rf_metrics
    logger.info("Random Forest Test    -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                rf_metrics["mae"], rf_metrics["rmse"], rf_metrics["r2"])

    # 4. XGBoost Regressor
    xgb_model = BaselineFactory.get_xgboost(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    xgb_model.fit(train_split.X_flat, train_split.y)
    xgb_test_preds = xgb_model.predict(test_split.X_flat)
    xgb_metrics = compute_regression_metrics(test_split.y, xgb_test_preds)
    benchmark_results["XGBoost"] = xgb_metrics
    logger.info("XGBoost Test          -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                xgb_metrics["mae"], xgb_metrics["rmse"], xgb_metrics["r2"])

    # ==============================================================
    # PHASE B: DEEP LEARNING (Tabular MLP & Multimodal FusionNet)
    # ==============================================================
    logger.info("\n--- Phase B: Deep Learning Architectures ---")

    # 5. Flat Tabular Deep MLP
    mlp_model = FlatDeepMLP(input_dim=train_split.X_flat.shape[1], hidden_dims=[128, 64, 32], dropout=0.20)
    mlp_model, mlp_history, _ = trainer.train_mlp(
        mlp_model, train_split, val_split, batch_size=64, lr=0.001, max_epochs=70, patience=10
    )
    with torch.no_grad():
        mlp_model.eval()
        test_x_t = torch.tensor(test_split.X_flat, dtype=torch.float32).to(trainer.device)
        mlp_test_preds = mlp_model(test_x_t).cpu().numpy()
    mlp_metrics = compute_regression_metrics(test_split.y, mlp_test_preds)
    benchmark_results["Deep_MLP"] = mlp_metrics
    logger.info("Deep MLP Test         -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                mlp_metrics["mae"], mlp_metrics["rmse"], mlp_metrics["r2"])

    # 6. ClimateRice-FusionNet (Cross-Modal Attention)
    modality_dims = {mod: len(cols) for mod, cols in modalities.items()}
    fusion_model = ClimateRiceFusionNet(
        modality_dims=modality_dims,
        embed_dim=24,
        dense_hidden=[64, 32],
        dropout=0.20,
    )
    fusion_model, fusion_history, _ = trainer.train_fusion_net(
        fusion_model, train_split, val_split, batch_size=64, lr=0.001, max_epochs=80, patience=12
    )

    # Multi-sample MC-Dropout uncertainty prediction on test partition
    with torch.no_grad():
        test_inputs = {k: torch.tensor(v, dtype=torch.float32).to(trainer.device) for k, v in test_split.X_dict.items()}
        mean_preds, std_preds, attn_weights = fusion_model.predict_with_uncertainty(test_inputs, num_mc_samples=50)
        fusion_test_preds = mean_preds.cpu().numpy()
        fusion_test_std = std_preds.cpu().numpy()

    fusion_metrics = compute_regression_metrics(test_split.y, fusion_test_preds)
    benchmark_results["ClimateRice_FusionNet"] = fusion_metrics
    logger.info("ClimateRice-FusionNet -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                fusion_metrics["mae"], fusion_metrics["rmse"], fusion_metrics["r2"])

    # ==============================================================
    # PHASE C: CONTROLLED MODALITY ABLATION EXPERIMENTS (A through G)
    # ==============================================================
    logger.info("\n--- Phase C: Controlled Modality Ablation Experiments ---")

    ablation_experiments = [
        {"id": "Exp_A_Weather_Only", "mods": ["weather"], "name": "Weather Only"},
        {"id": "Exp_B_Satellite_Only", "mods": ["satellite"], "name": "Satellite Only"},
        {"id": "Exp_C_Soil_Only", "mods": ["soil"], "name": "Soil Only"},
        {"id": "Exp_D_Weather_Soil", "mods": ["weather", "soil"], "name": "Weather + Soil"},
        {"id": "Exp_E_Satellite_Weather", "mods": ["satellite", "weather"], "name": "Satellite + Weather"},
        {"id": "Exp_F_Biophysical_All", "mods": ["satellite", "weather", "soil"], "name": "Satellite + Weather + Soil"},
        {"id": "Exp_G_Full_Multimodal", "mods": ["satellite", "weather", "soil", "historical"], "name": "Full Multimodal (+History)"},
    ]

    ablation_results: Dict[str, Any] = {}

    for exp in ablation_experiments:
        exp_id = exp["id"]
        exp_mods = exp["mods"]

        # Extract feature columns and slice matrices
        col_indices: List[int] = []
        for m in exp_mods:
            cols = modalities[m]
            col_indices.extend([all_feature_cols.index(c) for c in cols])

        X_train_sub = train_split.X_flat[:, col_indices]
        X_test_sub = test_split.X_flat[:, col_indices]

        # Train XGBoost on sub-modality
        exp_xgb = BaselineFactory.get_xgboost(n_estimators=180, learning_rate=0.05, max_depth=5, random_state=42)
        exp_xgb.fit(X_train_sub, train_split.y)
        exp_preds = exp_xgb.predict(X_test_sub)
        exp_met = compute_regression_metrics(test_split.y, exp_preds)

        ablation_results[exp_id] = {
            "name": exp["name"],
            "modalities": exp_mods,
            "num_features": len(col_indices),
            "mae": exp_met["mae"],
            "rmse": exp_met["rmse"],
            "r2": exp_met["r2"],
            "nrmse_pct": exp_met["nrmse_pct"],
        }
        logger.info("%-28s -> MAE: %.4f | RMSE: %.4f | R²: %.4f",
                    exp["name"], exp_met["mae"], exp_met["rmse"], exp_met["r2"])

    # Overwrite Exp G with FusionNet's dedicated cross-modal results
    ablation_results["Exp_G_Full_Multimodal"]["fusion_net_mae"] = fusion_metrics["mae"]
    ablation_results["Exp_G_Full_Multimodal"]["fusion_net_rmse"] = fusion_metrics["rmse"]
    ablation_results["Exp_G_Full_Multimodal"]["fusion_net_r2"] = fusion_metrics["r2"]

    # ==============================================================
    # PHASE D: STATISTICAL SIGNIFICANCE TESTS (H1 vs H0)
    # ==============================================================
    logger.info("\n--- Phase D: Hypothesis Testing (Paired t-test & Wilcoxon) ---")

    stat_vs_xgb = compare_models_statistically(
        test_split.y, fusion_test_preds, xgb_test_preds,
        name_a="ClimateRice-FusionNet", name_b="XGBoost_Baseline", alpha=0.05
    )
    stat_vs_single = compare_models_statistically(
        test_split.y, fusion_test_preds,
        BaselineFactory.get_xgboost().fit(
            train_split.X_flat[:, [all_feature_cols.index(c) for c in modalities["satellite"]]], train_split.y
        ).predict(test_split.X_flat[:, [all_feature_cols.index(c) for c in modalities["satellite"]]]),
        name_a="ClimateRice-FusionNet", name_b="Single_Modality_Satellite", alpha=0.05
    )
    stat_vs_biophys = compare_models_statistically(
        test_split.y, fusion_test_preds,
        BaselineFactory.get_xgboost().fit(
            train_split.X_flat[:, [all_feature_cols.index(c) for m in ["satellite", "weather", "soil"] for c in modalities[m]]], train_split.y
        ).predict(test_split.X_flat[:, [all_feature_cols.index(c) for m in ["satellite", "weather", "soil"] for c in modalities[m]]]),
        name_a="ClimateRice-FusionNet", name_b="Biophysical_Without_History", alpha=0.05
    )

    logger.info("Stat test vs XGBoost: %s", stat_vs_xgb["conclusion"])
    logger.info("Stat test vs Single Modality (Satellite): %s", stat_vs_single["conclusion"])

    # ==============================================================
    # PHASE E: EXPLAINABILITY (SHAP & Factor Attributions)
    # ==============================================================
    logger.info("\n--- Phase E: Initializing Explainable AI Engine ---")
    explainer = ClimateRiceExplainer(feature_names=all_feature_cols, modalities=modalities)
    explainer.fit_background(predict_fn=lambda x: xgb_model.predict(x), background_X=train_split.X_flat)
    global_importance = explainer.explain_global(test_split.X_flat)

    # ==============================================================
    # PHASE F: SERIALIZE ALL ARTIFACTS & METRICS
    # ==============================================================
    os.makedirs("models/saved_models", exist_ok=True)
    os.makedirs("experiments/results", exist_ok=True)

    # 1. PyTorch weights
    torch.save(fusion_model.state_dict(), "models/saved_models/climate_rice_fusion_net.pt")
    torch.save(mlp_model.state_dict(), "models/saved_models/mlp_model.pt")

    # 2. Scikit-learn & Joblib models
    joblib.dump(xgb_model, "models/saved_models/xgboost_baseline.joblib")
    joblib.dump(rf_model, "models/saved_models/random_forest_baseline.joblib")
    joblib.dump(ridge_model, "models/saved_models/ridge_baseline.joblib")
    joblib.dump(naive_model, "models/saved_models/naive_baseline.joblib")
    joblib.dump(explainer, "models/saved_models/explainer.joblib")

    # 3. Benchmark and statistical reports
    with open("experiments/results/ablation_benchmark.json", "w") as f:
        json.dump(ablation_results, f, indent=2)

    with open("experiments/results/model_benchmark.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    stat_report = {
        "vs_xgboost": stat_vs_xgb,
        "vs_single_modality": stat_vs_single,
        "vs_biophysical_only": stat_vs_biophys,
    }
    with open("experiments/results/statistical_validation.json", "w") as f:
        json.dump(stat_report, f, indent=2)

    with open("experiments/results/global_importance.json", "w") as f:
        json.dump(global_importance, f, indent=2)

    loss_curves = {
        "fusion_train_loss": fusion_history["train_loss"],
        "fusion_val_loss": fusion_history["val_loss"],
        "fusion_val_mae": fusion_history["val_mae"],
        "fusion_val_rmse": fusion_history["val_rmse"],
        "fusion_val_r2": fusion_history["val_r2"],
        "mlp_train_loss": mlp_history["train_loss"],
        "mlp_val_loss": mlp_history["val_loss"],
    }
    with open("experiments/results/loss_history.json", "w") as f:
        json.dump(loss_curves, f, indent=2)

    # 4. Save metadata
    model_metadata = {
        "model_name": "ClimateRice-FusionNet",
        "version": "1.0.0",
        "training_date": "2026-10-11",
        "num_parameters": sum(p.numel() for p in fusion_model.parameters()),
        "modalities": list(modalities.keys()),
        "total_features": len(all_feature_cols),
        "test_mae": fusion_metrics["mae"],
        "test_rmse": fusion_metrics["rmse"],
        "test_r2": fusion_metrics["r2"],
        "test_nrmse_pct": fusion_metrics["nrmse_pct"],
        "best_baseline": "XGBoost",
        "best_baseline_mae": xgb_metrics["mae"],
        "best_baseline_r2": xgb_metrics["r2"],
        "hypothesis_h1_accepted": stat_vs_single["statistically_significant"],
    }
    with open("models/saved_models/model_metadata.json", "w") as f:
        json.dump(model_metadata, f, indent=2)

    # Save test predictions for evaluation scripts
    test_eval_df = pd.DataFrame({
        "district": test_split.districts,
        "year": test_split.years,
        "actual_yield": test_split.y,
        "pred_fusion_net": fusion_test_preds,
        "pred_uncertainty_std": fusion_test_std,
        "pred_xgboost": xgb_test_preds,
        "pred_random_forest": rf_test_preds,
        "pred_ridge": ridge_test_preds,
        "pred_naive": naive_test_preds,
    })
    test_eval_df.to_csv("experiments/results/test_predictions.csv", index=False)

    logger.info("\nAll models trained, evaluated, and saved to models/saved_models/")
    logger.info("Experiment results saved to experiments/results/")
    logger.info("==================================================")


if __name__ == "__main__":
    main()
