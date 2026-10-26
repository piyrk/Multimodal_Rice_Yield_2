"""Deep MLP Architecture for Tabular Environmental Features."""

from typing import List, Optional
import torch
import torch.nn as nn


class FlatDeepMLP(nn.Module):
    """Deep Multi-Layer Perceptron for flat tabular feature concatenation."""

    def __init__(
        self,
        input_dim: int,
        hidden_dims: Optional[List[int]] = None,
        dropout: float = 0.20,
    ):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [128, 64, 32]

        layers: List[nn.Module] = []
        prev_dim = input_dim

        for dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, dim))
            layers.append(nn.BatchNorm1d(dim))
            layers.append(nn.GELU())
            layers.append(nn.Dropout(dropout))
            prev_dim = dim

        layers.append(nn.Linear(prev_dim, 1))
        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x).squeeze(-1)
