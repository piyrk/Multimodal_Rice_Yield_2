"""Unit Tests for Deep Learning and Baseline Models."""

import pytest
import numpy as np
import torch
from src.models.baselines import NaiveDistrictMeanBaseline, BaselineFactory
from src.models.multimodal_fusion import ClimateRiceFusionNet


def test_naive_baseline():
    districts = ["DistrictA", "DistrictA", "DistrictB", "DistrictB"]
    y = np.array([2.5, 3.5, 4.0, 5.0], dtype=np.float32)

    model = NaiveDistrictMeanBaseline().fit(districts, y)
    preds = model.predict(["DistrictA", "DistrictB", "DistrictUnknown"])

    assert np.isclose(preds[0], 3.0)
    assert np.isclose(preds[1], 4.5)
    assert np.isclose(preds[2], np.mean(y))


def test_tree_baselines():
    X = np.random.randn(50, 10)
    y = 2.0 + X[:, 0] * 0.5 + np.random.randn(50) * 0.1

    rf = BaselineFactory.get_random_forest(n_estimators=10, max_depth=4)
    rf.fit(X, y)
    rf_preds = rf.predict(X[:5])
    assert len(rf_preds) == 5

    xgb_model = BaselineFactory.get_xgboost(n_estimators=10, max_depth=3)
    xgb_model.fit(X, y)
    xgb_preds = xgb_model.predict(X[:5])
    assert len(xgb_preds) == 5


def test_climate_rice_fusion_net():
    modality_dims = {
        "satellite": 5,
        "weather": 10,
        "soil": 7,
        "historical": 4,
    }
    model = ClimateRiceFusionNet(modality_dims=modality_dims, embed_dim=16, dense_hidden=[32, 16])
    batch_size = 8

    sample_inputs = {
        mod: torch.randn(batch_size, dim)
        for mod, dim in modality_dims.items()
    }

    out, attn = model(sample_inputs)
    assert out.shape == (batch_size,)
    assert attn.shape == (batch_size, 4)
    # Check attention weights sum to 1 across modalities
    sums = torch.sum(attn, dim=1)
    assert torch.allclose(sums, torch.ones_like(sums), atol=1e-5)

    # Test MC-Dropout uncertainty
    mean_p, std_p, mean_a = model.predict_with_uncertainty(sample_inputs, num_mc_samples=10)
    assert mean_p.shape == (batch_size,)
    assert std_p.shape == (batch_size,)
    assert (std_p >= 0).all()
