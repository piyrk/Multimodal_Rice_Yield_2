"""Model architectures and baseline registry for ClimateRice-AI."""

from .baselines import NaiveDistrictMeanBaseline, BaselineFactory
from .mlp import FlatDeepMLP
from .multimodal_fusion import ClimateRiceFusionNet

__all__ = [
    "NaiveDistrictMeanBaseline",
    "BaselineFactory",
    "FlatDeepMLP",
    "ClimateRiceFusionNet",
]
