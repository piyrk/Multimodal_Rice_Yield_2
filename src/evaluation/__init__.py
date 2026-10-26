"""Evaluation metrics and statistical testing package for ClimateRice-AI."""

from .metrics import (
    compute_regression_metrics,
    evaluate_by_yield_bracket,
    evaluate_by_year,
)
from .statistical_tests import compare_models_statistically

__all__ = [
    "compute_regression_metrics",
    "evaluate_by_yield_bracket",
    "evaluate_by_year",
    "compare_models_statistically",
]
