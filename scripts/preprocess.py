"""Script to perform leakage-free preprocessing, temporal splitting, and scaling."""

import os
import sys
import logging
import joblib
import pandas as pd

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.preprocessing.pipeline import PreprocessingPipeline
from src.data.validation import validate_processed_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("==================================================")
    logger.info(" ClimateRice-AI: Preprocessing & Splitting Pipeline")
    logger.info("==================================================")

    raw_path = "data/raw/harmonized_rice_multimodal.csv"
    if not os.path.exists(raw_path):
        logger.error("Raw data file %s not found. Please run download_data.py first.", raw_path)
        sys.exit(1)

    df_raw = pd.read_csv(raw_path)
    logger.info("Loaded raw data: %d rows from %s", len(df_raw), raw_path)

    # Initialize preprocessing pipeline
    pipeline = PreprocessingPipeline(
        target_col="yield_tonnes_per_ha",
        train_max_year=2014,
        val_years=[2015, 2016],
        test_min_year=2017,
    )

    # 1. Temporal split
    train_df, val_df, test_df = pipeline.temporal_split(df_raw)

    # 2. Fit strictly on train and transform
    train_split = pipeline.fit_transform(train_df)
    val_split = pipeline.transform(val_df)
    test_split = pipeline.transform(test_df)

    # 3. Validate processed data
    logger.info("Validating processed partitions...")
    val_report = validate_processed_data(train_df, pipeline.all_feature_cols)
    if not val_report["status"]:
        logger.warning("Processed validation warning: %s", val_report)
    else:
        logger.info("Processed data validation PASSED: Zero NaNs/Infs detected.")

    # 4. Save processed artifacts
    os.makedirs("data/processed", exist_ok=True)
    os.makedirs("models/saved_models", exist_ok=True)

    train_df.to_csv("data/processed/train.csv", index=False)
    val_df.to_csv("data/processed/val.csv", index=False)
    test_df.to_csv("data/processed/test.csv", index=False)

    splits_bundle = {
        "train": train_split,
        "val": val_split,
        "test": test_split,
        "all_feature_cols": pipeline.all_feature_cols,
        "modalities": pipeline.modalities,
    }
    joblib.dump(splits_bundle, "data/processed/splits_bundle.joblib")
    pipeline.save("models/saved_models/preprocessor.joblib")

    logger.info("Saved train.csv (%d), val.csv (%d), test.csv (%d)", len(train_df), len(val_df), len(test_df))
    logger.info("Saved splits_bundle.joblib and preprocessor.joblib")
    logger.info("==================================================")


if __name__ == "__main__":
    main()
