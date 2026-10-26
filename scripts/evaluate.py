"""Comprehensive Evaluation and Visualization Generator for ClimateRice-AI."""

from typing import Dict, Any, List
import os
import sys
import json
import logging
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.evaluation.metrics import evaluate_by_yield_bracket, evaluate_by_year

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("==================================================")
    logger.info(" ClimateRice-AI: Evaluation & Visualizations Suite")
    logger.info("==================================================")

    fig_dir = "reports/figures"
    res_dir = "reports/results"
    os.makedirs(fig_dir, exist_ok=True)
    os.makedirs(res_dir, exist_ok=True)

    test_preds_path = "experiments/results/test_predictions.csv"
    if not os.path.exists(test_preds_path):
        logger.error("Test predictions file %s not found. Please run train.py first.", test_preds_path)
        sys.exit(1)

    df_preds = pd.read_csv(test_preds_path)
    y_true = df_preds["actual_yield"].values
    y_pred_fusion = df_preds["pred_fusion_net"].values
    y_pred_xgb = df_preds["pred_xgboost"].values

    with open("experiments/results/ablation_benchmark.json", "r") as f:
        ablation_data = json.load(f)

    with open("experiments/results/global_importance.json", "r") as f:
        importance_data = json.load(f)

    with open("experiments/results/loss_history.json", "r") as f:
        loss_data = json.load(f)

    # -------------------------------------------------------------
    # FIGURE 1: Predicted vs Actual Yield Scatter
    # -------------------------------------------------------------
    plt.figure(figsize=(7, 6), dpi=300)
    plt.scatter(y_true, y_pred_xgb, alpha=0.5, color="#3b82f6", label="XGBoost Baseline", edgecolors="none", s=35)
    plt.scatter(y_true, y_pred_fusion, alpha=0.8, color="#10b981", label="ClimateRice-FusionNet", edgecolors="k", linewidth=0.5, s=45)
    min_v = min(y_true.min(), y_pred_fusion.min()) - 0.2
    max_v = max(y_true.max(), y_pred_fusion.max()) + 0.2
    plt.plot([min_v, max_v], [min_v, max_v], "r--", linewidth=1.5, label="1:1 Perfect Agreement")
    plt.title("Predicted vs. Observed Rice Yield on Held-Out Test Set (>=2017)", fontsize=12, fontweight="bold")
    plt.xlabel("Observed Ground-Truth Yield (tonnes/ha)", fontsize=11)
    plt.ylabel("Predicted Yield (tonnes/ha)", fontsize=11)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(frameon=True)
    plt.tight_layout()
    fig1_path = os.path.join(fig_dir, "01_predicted_vs_actual.png")
    plt.savefig(fig1_path)
    plt.close()
    logger.info("Saved %s", fig1_path)

    # -------------------------------------------------------------
    # FIGURE 2: Residuals Plot
    # -------------------------------------------------------------
    residuals = y_true - y_pred_fusion
    plt.figure(figsize=(7, 5), dpi=300)
    plt.axhline(0, color="red", linestyle="--", linewidth=1.5)
    plt.scatter(y_pred_fusion, residuals, color="#059669", alpha=0.7, edgecolors="k", linewidth=0.4, s=40)
    plt.title("Residual Distribution (ClimateRice-FusionNet)", fontsize=12, fontweight="bold")
    plt.xlabel("Predicted Yield (tonnes/ha)", fontsize=11)
    plt.ylabel("Residual: Actual - Predicted (tonnes/ha)", fontsize=11)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    fig2_path = os.path.join(fig_dir, "02_residuals_plot.png")
    plt.savefig(fig2_path)
    plt.close()
    logger.info("Saved %s", fig2_path)

    # -------------------------------------------------------------
    # FIGURE 3: Modality Ablation Comparison Bar Chart
    # -------------------------------------------------------------
    exp_labels = []
    exp_maes = []
    exp_rmses = []
    for exp_id, data in ablation_data.items():
        if not isinstance(data, dict) or "name" not in data:
            continue
        name = data["name"].replace("Experiment ", "")
        exp_labels.append(name)
        # Use fusion net metrics for full multimodal if available
        mae_val = data.get("fusion_net_mae", data["mae"])
        rmse_val = data.get("fusion_net_rmse", data["rmse"])
        exp_maes.append(mae_val)
        exp_rmses.append(rmse_val)

    x = np.arange(len(exp_labels))
    width = 0.35

    plt.figure(figsize=(10, 5), dpi=300)
    plt.bar(x - width/2, exp_maes, width, label="MAE (t/ha)", color="#3b82f6")
    plt.bar(x + width/2, exp_rmses, width, label="RMSE (t/ha)", color="#f59e0b")
    plt.xticks(x, exp_labels, rotation=25, ha="right", fontsize=9)
    plt.ylabel("Error (tonnes/hectare)", fontsize=11)
    plt.title("Modality Ablation Performance: Benefit of Multimodal Integration", fontsize=12, fontweight="bold")
    plt.grid(axis="y", linestyle=":", alpha=0.6)
    plt.legend()
    plt.tight_layout()
    fig3_path = os.path.join(fig_dir, "03_modality_ablation.png")
    plt.savefig(fig3_path)
    plt.close()
    logger.info("Saved %s", fig3_path)

    # -------------------------------------------------------------
    # FIGURE 4: Training & Validation Convergence Curves
    # -------------------------------------------------------------
    train_loss = loss_data["fusion_train_loss"]
    val_loss = loss_data["fusion_val_loss"]
    epochs = range(1, len(train_loss) + 1)

    plt.figure(figsize=(7, 5), dpi=300)
    plt.plot(epochs, train_loss, label="Training Loss (Huber)", color="#2563eb", linewidth=2)
    plt.plot(epochs, val_loss, label="Validation Loss", color="#dc2626", linewidth=2, linestyle="--")
    plt.title("ClimateRice-FusionNet Learning Curves & Early Stopping", fontsize=12, fontweight="bold")
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Loss Value", fontsize=11)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend()
    plt.tight_layout()
    fig4_path = os.path.join(fig_dir, "04_loss_curves.png")
    plt.savefig(fig4_path)
    plt.close()
    logger.info("Saved %s", fig4_path)

    # -------------------------------------------------------------
    # FIGURE 5: Top Feature Importance by Modality
    # -------------------------------------------------------------
    feat_list = importance_data["feature_importance"][:12]
    feat_names = [f["feature"] for f in feat_list][::-1]
    scores = [f["importance_score"] for f in feat_list][::-1]
    mod_colors = {
        "satellite": "#10b981",
        "weather": "#3b82f6",
        "soil": "#8b5cf6",
        "historical": "#f59e0b",
        "other": "#9ca3af",
    }
    bar_colors = [mod_colors.get(f["modality"], "#9ca3af") for f in feat_list][::-1]

    plt.figure(figsize=(9, 6), dpi=300)
    bars = plt.barh(feat_names, scores, color=bar_colors, edgecolor="k", linewidth=0.5)
    plt.title("Global Feature Importance (SHAP-calibrated Sensitivities)", fontsize=12, fontweight="bold")
    plt.xlabel("Relative Importance Weight", fontsize=11)
    # Custom legend
    handles = [
        plt.Rectangle((0, 0), 1, 1, color=color) for color in ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"]
    ]
    plt.legend(handles, ["Satellite", "Weather", "Soil", "Historical"], loc="lower right", frameon=True)
    plt.grid(axis="x", linestyle=":", alpha=0.6)
    plt.tight_layout()
    fig5_path = os.path.join(fig_dir, "05_feature_importance.png")
    plt.savefig(fig5_path)
    plt.close()
    logger.info("Saved %s", fig5_path)

    # -------------------------------------------------------------
    # Stratified Bracket Analysis
    # -------------------------------------------------------------
    bracket_results = evaluate_by_yield_bracket(y_true, y_pred_fusion)
    bracket_path = os.path.join(res_dir, "stratified_yield_brackets.json")
    with open(bracket_path, "w") as f:
        json.dump(bracket_results, f, indent=2)

    yearly_results = evaluate_by_year(y_true, y_pred_fusion, df_preds["year"].tolist())
    yearly_path = os.path.join(res_dir, "yearly_performance.csv")
    yearly_results.to_csv(yearly_path, index=False)

    logger.info("Stratified bracket evaluation written to %s", bracket_path)
    logger.info("Yearly performance breakdown written to %s", yearly_path)
    logger.info("All evaluation plots generated successfully in %s", fig_dir)
    logger.info("==================================================")


if __name__ == "__main__":
    main()
