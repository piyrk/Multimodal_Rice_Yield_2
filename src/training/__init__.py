"""Training and optimization package for ClimateRice-AI."""

from .trainer import ModelTrainer, MultimodalDataset
from .losses import ClimateAwareLoss

__all__ = ["ModelTrainer", "MultimodalDataset", "ClimateAwareLoss"]
