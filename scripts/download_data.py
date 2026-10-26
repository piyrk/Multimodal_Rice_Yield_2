"""Script to acquire, align, and validate raw agricultural and environmental datasets."""

import os
import sys
import logging
import json

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.data.ingestion import DatasetManager
from src.data.validation import validate_raw_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("==================================================")
    logger.info(" ClimateRice-AI: Data Ingestion & Validation Pipeline")
    logger.info("==================================================")

    manager = DatasetManager(raw_dir="data/raw", processed_dir="data/processed")
    df = manager.load_or_generate_dataset(start_year=2000, end_year=2020, random_seed=42)

    logger.info("Validating dataset integrity and agronomic boundaries...")
    validation_report = validate_raw_data(df)

    report_path = os.path.join("data/raw", "validation_report.json")
    with open(report_path, "w") as f:
        json.dump(validation_report, f, indent=2)

    logger.info("Validation Status: %s", "PASSED" if validation_report["status"] else "FAILED")
    logger.info("Total Records: %d across %d columns", len(df), len(df.columns))
    logger.info("Districts Covered: %d | Temporal Span: %d - %d",
                df["district_name"].nunique(), df["crop_year"].min(), df["crop_year"].max())
    logger.info("Mean Target Yield: %.2f tonnes/ha (std: %.2f)",
                df["yield_tonnes_per_ha"].mean(), df["yield_tonnes_per_ha"].std())
    logger.info("Validation report written to %s", report_path)
    logger.info("==================================================")


if __name__ == "__main__":
    main()
