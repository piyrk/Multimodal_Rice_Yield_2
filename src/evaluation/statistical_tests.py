"""Statistical Significance Validation Module for ClimateRice-AI.

Provides rigorous paired statistical hypothesis testing (Student's t-test and Wilcoxon signed-rank)
to empirically accept or reject Null Hypothesis H0.
"""

from typing import Dict, Any, Tuple
import numpy as np
from scipy import stats


def compare_models_statistically(
    y_true: np.ndarray,
    preds_model_a: np.ndarray,
    preds_model_b: np.ndarray,
    name_a: str = "Multimodal_FusionNet",
    name_b: str = "Baseline",
    alpha: float = 0.05,
) -> Dict[str, Any]:
    """Conducts paired parametric and non-parametric hypothesis tests.

    Tests if absolute residuals of Model A are significantly lower than Model B.
    """
    y_true = np.asarray(y_true)
    errors_a = np.abs(y_true - np.asarray(preds_model_a))
    errors_b = np.abs(y_true - np.asarray(preds_model_b))

    diff = errors_b - errors_a  # Positive means Model A has smaller errors
    mean_diff = float(np.mean(diff))
    std_diff = float(np.std(diff, ddof=1))

    # Paired Student's t-test
    t_stat, t_pvalue = stats.ttest_rel(errors_a, errors_b)

    # Wilcoxon signed-rank test
    try:
        w_stat, w_pvalue = stats.wilcoxon(errors_a, errors_b)
    except Exception:
        w_stat, w_pvalue = 0.0, 1.0

    is_significant = bool(t_pvalue < alpha and mean_diff > 0)

    if is_significant:
        conclusion = (
            f"Hypothesis H1 ACCEPTED: {name_a} shows a statistically significant error reduction over {name_b} "
            f"(p={t_pvalue:.4e} < {alpha}, mean error reduction: {mean_diff:.4f} t/ha)."
        )
    elif t_pvalue < alpha and mean_diff < 0:
        conclusion = (
            f"Alternative outcome: {name_b} shows a statistically significant error reduction over {name_a} "
            f"(p={t_pvalue:.4e} < {alpha}, mean difference: {-mean_diff:.4f} t/ha)."
        )
    else:
        conclusion = (
            f"Fail to reject Null Hypothesis H0: No statistically significant difference detected "
            f"(p={t_pvalue:.4f} >= {alpha})."
        )

    return {
        "model_a": name_a,
        "model_b": name_b,
        "n_test_samples": int(len(y_true)),
        "mean_absolute_error_a": float(np.mean(errors_a)),
        "mean_absolute_error_b": float(np.mean(errors_b)),
        "mean_error_reduction": round(mean_diff, 4),
        "std_error_difference": round(std_diff, 4),
        "paired_t_statistic": round(float(t_stat), 4),
        "paired_t_pvalue": float(t_pvalue),
        "wilcoxon_statistic": round(float(w_stat), 4),
        "wilcoxon_pvalue": float(w_pvalue),
        "alpha_threshold": alpha,
        "statistically_significant": is_significant,
        "conclusion": conclusion,
    }
