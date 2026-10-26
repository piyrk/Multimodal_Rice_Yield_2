"""Data Preprocessing and Leakage-Free Splitting Pipeline for ClimateRice-AI.

Implements temporal holdout splitting and strictly fit-on-train scaling
to ensure zero information leakage from future years.
"""

from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
import os
import joblib
import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

logger = logging.getLogger(__name__)


@dataclass
class DataSplit:
    """Holds partitioned dataset features and targets."""
    df_raw: pd.DataFrame
    X_dict: Dict[str, np.ndarray]       # Modality -> scaled numpy matrix
    X_flat: np.ndarray                  # Concatenated all features
    y: np.ndarray                       # Yield target (t/ha)
    districts: List[str]
    years: List[int]
    feature_names: List[str]


class PreprocessingPipeline:
    """Handles temporal splitting, modality alignment, and leakage-safe scaling."""

    def __init__(
        self,
        target_col: str = "yield_tonnes_per_ha",
        modalities: Optional[Dict[str, List[str]]] = None,
        train_max_year: int = 2014,
        val_years: Optional[List[int]] = None,
        test_min_year: int = 2017,
    ):
        self.target_col = target_col
        self.train_max_year = train_max_year
        self.val_years = val_years or [2015, 2016]
        self.test_min_year = test_min_year

        # Default modality feature definitions
        self.modalities = modalities or {
            "satellite": [
                "ndvi_mean",
                "ndvi_peak",
                "evi_mean",
                "ndwi_mean",
                "ndvi_anomaly",
            ],
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
            ],
        }

        self.all_feature_cols = [
            f for group in self.modalities.values() for f in group
        ]

        # Scalers and Imputers (fit strictly on training data)
        self.imputer: Optional[SimpleImputer] = None
        self.scaler: Optional[StandardScaler] = None
        self.modality_scalers: Dict[str, StandardScaler] = {}
        self.is_fitted: bool = False

    def temporal_split(
        self, df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Partitions DataFrame into Train, Validation, and Test sets by Crop Year.

        Prevents temporal data leakage.
        """
        train_df = df[df["crop_year"] <= self.train_max_year].copy()
        val_df = df[df["crop_year"].isin(self.val_years)].copy()
        test_df = df[df["crop_year"] >= self.test_min_year].copy()

        logger.info(
            "Temporal split summary: Train (<=%d): %d rows | Val (%s): %d rows | Test (>=%d): %d rows",
            self.train_max_year,
            len(train_df),
            self.val_years,
            len(val_df),
            self.test_min_year,
            len(test_df),
        )

        return train_df, val_df, test_df

    def fit_transform(
        self, train_df: pd.DataFrame
    ) -> DataSplit:
        """Fits imputers and scalers ONLY on training data, then transforms train."""
        logger.info("Fitting preprocessing scalers strictly on training partition (%d rows)", len(train_df))
        
        # 1. Fit Imputer
        self.imputer = SimpleImputer(strategy="median")
        X_train_raw = train_df[self.all_feature_cols].values
        self.imputer.fit(X_train_raw)
        X_train_imputed = self.imputer.transform(X_train_raw)

        # 2. Fit Flat Scaler
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train_imputed)

        # 3. Fit Modality-specific Scalers
        self.modality_scalers = {}
        X_dict: Dict[str, np.ndarray] = {}
        for mod_name, mod_cols in self.modalities.items():
            mod_imputer = SimpleImputer(strategy="median")
            mod_raw = train_df[mod_cols].values
            mod_imputed = mod_imputer.fit_transform(mod_raw)

            mod_scaler = StandardScaler()
            X_dict[mod_name] = mod_scaler.fit_transform(mod_imputed)
            self.modality_scalers[mod_name] = mod_scaler

        self.is_fitted = True

        y_train = train_df[self.target_col].values.astype(np.float32)
        districts = train_df["district_name"].tolist() if "district_name" in train_df.columns else []
        years = train_df["crop_year"].tolist() if "crop_year" in train_df.columns else []

        return DataSplit(
            df_raw=train_df,
            X_dict=X_dict,
            X_flat=X_train_scaled.astype(np.float32),
            y=y_train,
            districts=districts,
            years=years,
            feature_names=self.all_feature_cols,
        )

    def transform(self, df: pd.DataFrame) -> DataSplit:
        """Transforms unseen data using previously fitted parameters (no fitting)."""
        if not self.is_fitted or self.imputer is None or self.scaler is None:
            raise RuntimeError("PreprocessingPipeline must be fit before transforming.")

        X_raw = df[self.all_feature_cols].values
        X_imputed = self.imputer.transform(X_raw)
        X_scaled = self.scaler.transform(X_imputed)

        X_dict: Dict[str, np.ndarray] = {}
        for mod_name, mod_cols in self.modalities.items():
            mod_raw = df[mod_cols].values
            # Impute and transform with fitted modality scaler
            mod_scaler = self.modality_scalers[mod_name]
            # Use mean from flat scaler slice or fit_transform params
            col_indices = [self.all_feature_cols.index(c) for c in mod_cols]
            mod_imputed = X_imputed[:, col_indices]
            X_dict[mod_name] = mod_scaler.transform(mod_imputed)

        y = df[self.target_col].values.astype(np.float32) if self.target_col in df.columns else np.zeros(len(df), dtype=np.float32)
        districts = df["district_name"].tolist() if "district_name" in df.columns else []
        years = df["crop_year"].tolist() if "crop_year" in df.columns else []

        return DataSplit(
            df_raw=df,
            X_dict=X_dict,
            X_flat=X_scaled.astype(np.float32),
            y=y,
            districts=districts,
            years=years,
            feature_names=self.all_feature_cols,
        )

    def save(self, filepath: str) -> None:
        """Saves fitted pipeline state for inference serving."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)
        logger.info("Saved fitted PreprocessingPipeline to %s", filepath)

    @classmethod
    def load(cls, filepath: str) -> "PreprocessingPipeline":
        """Loads fitted pipeline from disk."""
        pipeline = joblib.load(filepath)
        logger.info("Loaded PreprocessingPipeline from %s", filepath)
        return pipeline
