"""Evaluation Metrics Module for ClimateRice-AI."""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score


def compute_regression_metrics(
    y_true: np.ndarray, y_pred: np.ndarray
) -> Dict[str, float]:
    """Computes standard and normalized regression performance metrics."""
    y_true = np.asarray(y_true, dtype=np.float64)
    y_pred = np.asarray(y_pred, dtype=np.float64)

    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    mean_val = float(np.mean(y_true))
    nrmse_pct = float((rmse / mean_val) * 100.0) if mean_val != 0 else 0.0

    # Robust MAPE
    non_zero = y_true > 0.01
    if np.sum(non_zero) > 0:
        mape_pct = float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100.0)
    else:
        mape_pct = 0.0

    max_error = float(np.max(np.abs(y_true - y_pred)))

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "nrmse_pct": round(nrmse_pct, 2),
        "r2": round(r2, 4),
        "mape_pct": round(mape_pct, 2),
        "max_error": round(max_error, 4),
        "n_samples": int(len(y_true)),
    }


def evaluate_by_yield_bracket(
    y_true: np.ndarray, y_pred: np.ndarray
) -> Dict[str, Dict[str, float]]:
    """Analyzes prediction error stratified by agronomic yield regimes.

    - Low Yield (< 2.0 t/ha): Rainfed / stress prone
    - Medium Yield (2.0 - 3.5 t/ha): Standard irrigated/rainfed lowland
    - High Yield (> 3.5 t/ha): Intensive high-input irrigated
    """
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    brackets = {
        "low_yield_under_2t": y_true < 2.0,
        "medium_yield_2_to_3_5t": (y_true >= 2.0) & (y_true <= 3.5),
        "high_yield_above_3_5t": y_true > 3.5,
    }

    results = {}
    for name, mask in brackets.items():
        if np.sum(mask) > 0:
            results[name] = compute_regression_metrics(y_true[mask], y_pred[mask])
        else:
            results[name] = {"n_samples": 0, "mae": 0.0, "rmse": 0.0, "r2": 0.0}

    return results


def evaluate_by_year(
    y_true: np.ndarray, y_pred: np.ndarray, years: List[int]
) -> pd.DataFrame:
    """Computes performance metrics broken down by individual harvest year."""
    df_eval = pd.DataFrame({"year": years, "actual": y_true, "predicted": y_pred})
    yearly_metrics: List[Dict[str, Any]] = []

    for yr, group in df_eval.groupby("year"):
        metrics = compute_regression_metrics(group["actual"].values, group["predicted"].values)
        metrics["year"] = int(yr)
        yearly_metrics.append(metrics)

    return pd.DataFrame(yearly_metrics).sort_values("year")
