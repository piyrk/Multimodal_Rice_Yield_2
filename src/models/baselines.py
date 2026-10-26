"""Baseline Models Module for ClimateRice-AI.

Implements standard benchmark models:
1. Naive District Mean Baseline
2. L2 Regularized Linear Regression (Ridge)
3. Random Forest Regressor
4. Gradient Boosted Trees (XGBoost / HistGradientBoosting)
"""

from typing import Dict, Any, Optional, List
import logging
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor

logger = logging.getLogger(__name__)

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    logger.warning("XGBoost not yet detected; fallback to HistGradientBoostingRegressor will be supported.")


class NaiveDistrictMeanBaseline:
    """Predicts historical training mean yield for each district."""

    def __init__(self):
        self.district_means: Dict[str, float] = {}
        self.global_mean: float = 2.50

    def fit(self, districts: List[str], y: np.ndarray) -> "NaiveDistrictMeanBaseline":
        self.global_mean = float(np.mean(y))
        df_tmp = pd.DataFrame({"district": districts, "yield": y})
        self.district_means = df_tmp.groupby("district")["yield"].mean().to_dict()
        return self

    def predict(self, districts: List[str]) -> np.ndarray:
        return np.array([self.district_means.get(d, self.global_mean) for d in districts], dtype=np.float32)


class BaselineFactory:
    """Factory to instantiate and train traditional machine learning baselines."""

    @staticmethod
    def get_ridge(alpha: float = 1.0, random_state: int = 42) -> Ridge:
        return Ridge(alpha=alpha, random_state=random_state)

    @staticmethod
    def get_random_forest(
        n_estimators: int = 150, max_depth: int = 12, random_state: int = 42, n_jobs: int = -1
    ) -> RandomForestRegressor:
        return RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            n_jobs=n_jobs,
        )

    @staticmethod
    def get_xgboost(
        n_estimators: int = 200,
        learning_rate: float = 0.05,
        max_depth: int = 6,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        random_state: int = 42,
    ):
        if HAS_XGBOOST:
            return xgb.XGBRegressor(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                subsample=subsample,
                colsample_bytree=colsample_bytree,
                random_state=random_state,
                n_jobs=-1,
            )
        else:
            logger.info("Using scikit-learn HistGradientBoostingRegressor as gradient boosting baseline.")
            return HistGradientBoostingRegressor(
                max_iter=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=random_state,
            )
