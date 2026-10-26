"""ClimateRice-FusionNet: Multimodal Gated Attention Architecture.

Projects heterogeneous agricultural modalities (satellite, weather, soil, history)
into specialized latent representations and employs cross-modal gated attention fusion
with Monte Carlo Dropout uncertainty quantification.
"""

from typing import Dict, Tuple, Optional, List
import torch
import torch.nn as nn
import torch.nn.functional as F


class ModalityEncoder(nn.Module):
    """Encodes a single modality into a unified latent embedding space."""

    def __init__(self, in_features: int, out_features: int, dropout: float = 0.20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, out_features),
            nn.LayerNorm(out_features),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(out_features, out_features),
            nn.LayerNorm(out_features),
            nn.GELU(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class CrossModalGatedAttention(nn.Module):
    """Computes cross-modal dynamic attention weights across modality embeddings."""

    def __init__(self, embed_dim: int, num_modalities: int):
        super().__init__()
        self.num_modalities = num_modalities
        self.attention_net = nn.Sequential(
            nn.Linear(embed_dim, embed_dim // 2),
            nn.Tanh(),
            nn.Linear(embed_dim // 2, 1),
        )

    def forward(self, modality_embeddings: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # modality_embeddings shape: [batch_size, num_modalities, embed_dim]
        scores = self.attention_net(modality_embeddings)  # [batch_size, num_modalities, 1]
        attn_weights = F.softmax(scores, dim=1)           # [batch_size, num_modalities, 1]
        attended = torch.sum(attn_weights * modality_embeddings, dim=1)  # [batch_size, embed_dim]
        return attended, attn_weights.squeeze(-1)


class ClimateRiceFusionNet(nn.Module):
    """End-to-End Multimodal Deep Neural Network with Cross-Modal Attention."""

    def __init__(
        self,
        modality_dims: Dict[str, int],
        embed_dim: int = 24,
        dense_hidden: Optional[List[int]] = None,
        dropout: float = 0.20,
    ):
        super().__init__()
        self.modality_names = list(modality_dims.keys())
        self.embed_dim = embed_dim

        # 1. Modality-specific representation encoders
        self.encoders = nn.ModuleDict({
            mod_name: ModalityEncoder(in_dim, embed_dim, dropout=dropout)
            for mod_name, in_dim in modality_dims.items()
        })

        # 2. Cross-Modal Attention
        self.cross_attention = CrossModalGatedAttention(embed_dim, len(self.modality_names))

        # 3. Prediction Head with Highway Concatenation
        # Input to head = attended_dim (embed_dim) + concatenated_all (len(modalities) * embed_dim)
        total_fusion_dim = embed_dim + (len(self.modality_names) * embed_dim)

        if dense_hidden is None:
            dense_hidden = [64, 32]

        head_layers: List[nn.Module] = []
        prev = total_fusion_dim
        for h in dense_hidden:
            head_layers.append(nn.Linear(prev, h))
            head_layers.append(nn.LayerNorm(h))
            head_layers.append(nn.GELU())
            head_layers.append(nn.Dropout(dropout))
            prev = h

        head_layers.append(nn.Linear(prev, 1))
        self.prediction_head = nn.Sequential(*head_layers)

    def forward(
        self, modality_inputs: Dict[str, torch.Tensor]
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass through encoders, attention fusion, and prediction head.

        Returns:
            Tuple of (predicted_yield [batch], attention_weights [batch, num_modalities])
        """
        encoded_list: List[torch.Tensor] = []
        for mod_name in self.modality_names:
            x_m = modality_inputs[mod_name]
            h_m = self.encoders[mod_name](x_m)
            encoded_list.append(h_m)

        # Stack into [batch, num_modalities, embed_dim]
        stacked = torch.stack(encoded_list, dim=1)
        attended, attn_weights = self.cross_attention(stacked)

        # Flat concatenated embeddings
        flat_concat = torch.cat(encoded_list, dim=1)

        # Fused vector
        fused = torch.cat([attended, flat_concat], dim=1)
        out = self.prediction_head(fused).squeeze(-1)

        return out, attn_weights

    def predict_with_uncertainty(
        self,
        modality_inputs: Dict[str, torch.Tensor],
        num_mc_samples: int = 50,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Performs Monte Carlo Dropout sampling for epistemic uncertainty estimation.

        Returns:
            Tuple of (mean_yield, std_uncertainty, mean_attention_weights)
        """
        self.train()  # Enable dropout during inference
        preds: List[torch.Tensor] = []
        attns: List[torch.Tensor] = []

        with torch.no_grad():
            for _ in range(num_mc_samples):
                pred, attn = self.forward(modality_inputs)
                preds.append(pred)
                attns.append(attn)

        stacked_preds = torch.stack(preds, dim=0)  # [samples, batch]
        stacked_attns = torch.stack(attns, dim=0)  # [samples, batch, modalities]

        mean_pred = torch.mean(stacked_preds, dim=0)
        std_pred = torch.std(stacked_preds, dim=0)
        mean_attn = torch.mean(stacked_attns, dim=0)

        self.eval()
        return mean_pred, std_pred, mean_attn
