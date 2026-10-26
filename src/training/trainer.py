"""Model Training and Checkpointing Pipeline for ClimateRice-AI."""

from typing import Dict, Any, List, Optional, Tuple
import os
import time
import copy
import logging
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

from .losses import ClimateAwareLoss
from ..models.multimodal_fusion import ClimateRiceFusionNet
from ..models.mlp import FlatDeepMLP
from ..preprocessing.pipeline import DataSplit

logger = logging.getLogger(__name__)


class MultimodalDataset(torch.utils.data.Dataset):
    """PyTorch Dataset supporting dictionary of modalities and target."""

    def __init__(self, X_dict: Dict[str, np.ndarray], y: np.ndarray):
        self.modalities = {k: torch.tensor(v, dtype=torch.float32) for k, v in X_dict.items()}
        self.y = torch.tensor(y, dtype=torch.float32)
        self.length = len(y)

    def __len__(self) -> int:
        return self.length

    def __getitem__(self, idx: int) -> Tuple[Dict[str, torch.Tensor], torch.Tensor]:
        item_dict = {k: v[idx] for k, v in self.modalities.items()}
        return item_dict, self.y[idx]


class ModelTrainer:
    """Orchestrates model training, validation, early stopping, and history tracking."""

    def __init__(self, device: Optional[str] = None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        logger.info("ModelTrainer initialized on device: %s", self.device)

    def train_fusion_net(
        self,
        model: ClimateRiceFusionNet,
        train_split: DataSplit,
        val_split: DataSplit,
        batch_size: int = 64,
        lr: float = 0.001,
        weight_decay: float = 1e-4,
        max_epochs: int = 80,
        patience: int = 10,
    ) -> Tuple[ClimateRiceFusionNet, Dict[str, List[float]], Dict[str, float]]:
        """Trains ClimateRiceFusionNet with early stopping and learning rate scheduling."""
        model = model.to(self.device)
        train_ds = MultimodalDataset(train_split.X_dict, train_split.y)
        val_ds = MultimodalDataset(val_split.X_dict, val_split.y)

        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

        criterion = ClimateAwareLoss(delta=0.5)
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", factor=0.5, patience=4, min_lr=1e-5
        )

        history = {"train_loss": [], "val_loss": [], "val_mae": [], "val_rmse": [], "val_r2": []}
        best_val_loss = float("inf")
        best_weights = copy.deepcopy(model.state_dict())
        no_improve_count = 0

        for epoch in range(1, max_epochs + 1):
            model.train()
            running_train_loss = 0.0

            for batch_x, batch_y in train_loader:
                batch_x = {k: v.to(self.device) for k, v in batch_x.items()}
                batch_y = batch_y.to(self.device)

                optimizer.zero_grad()
                pred, _ = model(batch_x)
                loss = criterion(pred, batch_y)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()

                running_train_loss += loss.item() * len(batch_y)

            epoch_train_loss = running_train_loss / len(train_ds)

            # Validation
            model.eval()
            running_val_loss = 0.0
            val_preds: List[float] = []
            val_trues: List[float] = []

            with torch.no_grad():
                for batch_x, batch_y in val_loader:
                    batch_x = {k: v.to(self.device) for k, v in batch_x.items()}
                    batch_y = batch_y.to(self.device)

                    pred, _ = model(batch_x)
                    loss = criterion(pred, batch_y)
                    running_val_loss += loss.item() * len(batch_y)

                    val_preds.extend(pred.cpu().numpy().tolist())
                    val_trues.extend(batch_y.cpu().numpy().tolist())

            epoch_val_loss = running_val_loss / len(val_ds)
            epoch_val_mae = float(mean_absolute_error(val_trues, val_preds))
            epoch_val_rmse = float(root_mean_squared_error(val_trues, val_preds))
            epoch_val_r2 = float(r2_score(val_trues, val_preds))

            scheduler.step(epoch_val_loss)

            history["train_loss"].append(epoch_train_loss)
            history["val_loss"].append(epoch_val_loss)
            history["val_mae"].append(epoch_val_mae)
            history["val_rmse"].append(epoch_val_rmse)
            history["val_r2"].append(epoch_val_r2)

            if epoch_val_loss < best_val_loss:
                best_val_loss = epoch_val_loss
                best_weights = copy.deepcopy(model.state_dict())
                no_improve_count = 0
            else:
                no_improve_count += 1
                if no_improve_count >= patience:
                    logger.info("Early stopping triggered at epoch %d", epoch)
                    break

        model.load_state_dict(best_weights)
        best_metrics = {
            "val_loss": min(history["val_loss"]),
            "val_mae": min(history["val_mae"]),
            "val_rmse": min(history["val_rmse"]),
            "val_r2": max(history["val_r2"]),
        }
        return model, history, best_metrics

    def train_mlp(
        self,
        model: FlatDeepMLP,
        train_split: DataSplit,
        val_split: DataSplit,
        batch_size: int = 64,
        lr: float = 0.001,
        weight_decay: float = 1e-4,
        max_epochs: int = 80,
        patience: int = 10,
    ) -> Tuple[FlatDeepMLP, Dict[str, List[float]], Dict[str, float]]:
        """Trains FlatDeepMLP with tabular features."""
        model = model.to(self.device)
        train_x = torch.tensor(train_split.X_flat, dtype=torch.float32)
        train_y = torch.tensor(train_split.y, dtype=torch.float32)
        val_x = torch.tensor(val_split.X_flat, dtype=torch.float32)
        val_y = torch.tensor(val_split.y, dtype=torch.float32)

        train_ds = TensorDataset(train_x, train_y)
        val_ds = TensorDataset(val_x, val_y)

        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

        criterion = nn.HuberLoss(delta=0.5)
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=4)

        history = {"train_loss": [], "val_loss": [], "val_mae": [], "val_rmse": [], "val_r2": []}
        best_val_loss = float("inf")
        best_weights = copy.deepcopy(model.state_dict())
        no_improve_count = 0

        for epoch in range(1, max_epochs + 1):
            model.train()
            running_train_loss = 0.0

            for bx, by in train_loader:
                bx, by = bx.to(self.device), by.to(self.device)
                optimizer.zero_grad()
                pred = model(bx)
                loss = criterion(pred, by)
                loss.backward()
                optimizer.step()
                running_train_loss += loss.item() * len(by)

            epoch_train = running_train_loss / len(train_ds)

            model.eval()
            running_val = 0.0
            preds, trues = [], []
            with torch.no_grad():
                for bx, by in val_loader:
                    bx, by = bx.to(self.device), by.to(self.device)
                    pred = model(bx)
                    loss = criterion(pred, by)
                    running_val += loss.item() * len(by)
                    preds.extend(pred.cpu().numpy().tolist())
                    trues.extend(by.cpu().numpy().tolist())

            epoch_val = running_val / len(val_ds)
            epoch_mae = float(mean_absolute_error(trues, preds))
            epoch_rmse = float(root_mean_squared_error(trues, preds))
            epoch_r2 = float(r2_score(trues, preds))

            scheduler.step(epoch_val)

            history["train_loss"].append(epoch_train)
            history["val_loss"].append(epoch_val)
            history["val_mae"].append(epoch_mae)
            history["val_rmse"].append(epoch_rmse)
            history["val_r2"].append(epoch_r2)

            if epoch_val < best_val_loss:
                best_val_loss = epoch_val
                best_weights = copy.deepcopy(model.state_dict())
                no_improve_count = 0
            else:
                no_improve_count += 1
                if no_improve_count >= patience:
                    break

        model.load_state_dict(best_weights)
        best_metrics = {
            "val_loss": min(history["val_loss"]),
            "val_mae": min(history["val_mae"]),
            "val_rmse": min(history["val_rmse"]),
            "val_r2": max(history["val_r2"]),
        }
        return model, history, best_metrics
