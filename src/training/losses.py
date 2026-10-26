"""Loss Functions for Agricultural Yield Regression."""

import torch
import torch.nn as nn


class ClimateAwareLoss(nn.Module):
    """Huber Loss with asymmetric penalty on extreme yield failure under-estimation."""

    def __init__(self, delta: float = 0.5, under_penalty_factor: float = 1.25):
        super().__init__()
        self.huber = nn.HuberLoss(delta=delta, reduction="none")
        self.under_penalty_factor = under_penalty_factor

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        base_loss = self.huber(pred, target)
        # Agronomic risk penalty: under-predicting yield during crop failure is critical,
        # but over-predicting yield when actual yield is low creates catastrophic farmer shock.
        over_optimistic = (pred > target) & (target < 2.0)
        weights = torch.ones_like(target)
        weights[over_optimistic] = self.under_penalty_factor

        return torch.mean(base_loss * weights)
