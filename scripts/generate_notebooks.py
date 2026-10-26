"""Generates research-ready Jupyter notebooks for ClimateRice-AI."""

import os
import json


def make_notebook(cells):
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {
                "name": "python",
                "version": "3.12.10",
            },
        },
        "nbformat": 4,
        "nbformat_minor": 4,
    }


def code_cell(source):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in source.strip().split("\n")],
    }


def md_cell(source):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in source.strip().split("\n")],
    }


def main():
    nb_dir = "notebooks"
    os.makedirs(nb_dir, exist_ok=True)

    # 01 Data Exploration
    nb1 = make_notebook([
        md_cell("# 01. Exploratory Data Analysis: ClimateRice-AI\nAnalysis of multi-source agricultural, meteorological, satellite, and edaphic variables."),
        code_cell("""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

df = pd.read_csv('../data/raw/harmonized_rice_multimodal.csv')
print(f'Total observations: {len(df)}')
df.head()"""),
        code_cell("""# Summary statistics of target yield
df['yield_tonnes_per_ha'].describe()"""),
        code_cell("""# Yield distribution across agro-ecological zones
df.groupby('agro_ecological_zone')['yield_tonnes_per_ha'].agg(['count', 'mean', 'std'])"""),
    ])
    with open(os.path.join(nb_dir, "01_data_exploration.ipynb"), "w") as f:
        json.dump(nb1, f, indent=2)

    # 02 Preprocessing
    nb2 = make_notebook([
        md_cell("# 02. Preprocessing & Temporal Leakage Prevention\nStrict temporal holdout splitting and fit-on-train standardizers."),
        code_cell("""import sys; sys.path.insert(0, '..')
from src.preprocessing.pipeline import PreprocessingPipeline
import pandas as pd

df = pd.read_csv('../data/raw/harmonized_rice_multimodal.csv')
pipeline = PreprocessingPipeline(train_max_year=2014, val_years=[2015, 2016], test_min_year=2017)
train_df, val_df, test_df = pipeline.temporal_split(df)
train_split = pipeline.fit_transform(train_df)
test_split = pipeline.transform(test_df)
print(f'Train shape: {train_split.X_flat.shape}, Test shape: {test_split.X_flat.shape}')"""),
    ])
    with open(os.path.join(nb_dir, "02_preprocessing.ipynb"), "w") as f:
        json.dump(nb2, f, indent=2)

    # 03 Baselines
    nb3 = make_notebook([
        md_cell("# 03. Traditional Machine Learning Baselines\nEvaluates Naive Mean, Ridge, Random Forest, and XGBoost."),
        code_cell("""import joblib
bundle = joblib.load('../data/processed/splits_bundle.joblib')
train_split = bundle['train']
test_split = bundle['test']

from src.models.baselines import BaselineFactory, NaiveDistrictMeanBaseline
from src.evaluation.metrics import compute_regression_metrics

# XGBoost
xgb = BaselineFactory.get_xgboost(n_estimators=200, random_state=42)
xgb.fit(train_split.X_flat, train_split.y)
preds = xgb.predict(test_split.X_flat)
print('XGBoost Metrics:', compute_regression_metrics(test_split.y, preds))"""),
    ])
    with open(os.path.join(nb_dir, "03_baselines.ipynb"), "w") as f:
        json.dump(nb3, f, indent=2)

    # 04 Deep Learning
    nb4 = make_notebook([
        md_cell("# 04. Deep Learning Architectures\nCompares Flat Tabular MLP with ClimateRice-FusionNet with Cross-Modal Gated Attention."),
        code_cell("""import torch
from src.models.multimodal_fusion import ClimateRiceFusionNet
from src.training.trainer import ModelTrainer

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f'Active Device: {device}')"""),
    ])
    with open(os.path.join(nb_dir, "04_deep_learning.ipynb"), "w") as f:
        json.dump(nb4, f, indent=2)

    # 05 Multimodal Experiments
    nb5 = make_notebook([
        md_cell("# 05. Controlled Modality Ablation Experiments (Exp A – Exp G)\nEvaluates whether combining modalities improves yield forecasting."),
        code_cell("""import json
with open('../experiments/results/ablation_benchmark.json') as f:
    results = json.load(f)

import pandas as pd
pd.DataFrame(results).T[['name', 'mae', 'rmse', 'r2']]"""),
    ])
    with open(os.path.join(nb_dir, "05_multimodal_experiments.ipynb"), "w") as f:
        json.dump(nb5, f, indent=2)

    # 06 Explainability
    nb6 = make_notebook([
        md_cell("# 06. Explainable AI (SHAP & Factor Attributions)\nGlobal sensitivity ranking and local district factor explanations."),
        code_cell("""import json
with open('../experiments/results/global_importance.json') as f:
    importance = json.load(f)

import pandas as pd
pd.DataFrame(importance['feature_importance']).head(10)"""),
    ])
    with open(os.path.join(nb_dir, "06_explainability.ipynb"), "w") as f:
        json.dump(nb6, f, indent=2)

    print("Generated 6 research notebooks in notebooks/")


if __name__ == "__main__":
    main()
