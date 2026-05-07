"""Model definitions — mirrors PreRegNet_SE trained in the notebook exactly."""

from __future__ import annotations

import torch
import torch.nn as nn
from torchvision.models import RegNet_Y_400MF_Weights, regnet_y_400mf


class SEBlock(nn.Module):
    """Modified SE block from the paper.

    Key differences vs the original SE block:
    - squeeze_channels = channels * ratio  (multiply, not divide)
    - LeakyReLU instead of ReLU
    - Implemented with Conv2d so it works on [B, C, 1, 1] tensors
    """

    def __init__(self, channels: int, ratio: float = 0.25) -> None:
        """Build the SE block."""
        super().__init__()

        # Paper modification: multiply instead of divide
        squeeze_channels = max(int(channels * ratio), 1)

        # Squeeze: global average pool collapses H×W → 1×1
        self.pool = nn.AdaptiveAvgPool2d(1)

        # Excitation: two 1×1 convolutions with LeakyReLU + Sigmoid
        self.fc = nn.Sequential(
            nn.Conv2d(channels, squeeze_channels, kernel_size=1),
            nn.LeakyReLU(inplace=True),       # paper: LeakyReLU, not ReLU
            nn.Conv2d(squeeze_channels, channels, kernel_size=1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Apply squeeze-and-excitation channel attention."""
        scale = self.pool(x)      # [B, C, H, W] → [B, C, 1, 1]
        scale = self.fc(scale)    # channel-wise weights
        return x * scale          # re-scale the input feature map


class PreRegNet_SE(nn.Module):
    """Pretrained RegNetY-400MF backbone + modified SE block + custom head.

    Architecture (matches the notebook exactly so saved weights load cleanly):
        1. backbone  — RegNetY-400MF (fc replaced with Identity)
        2. se        — SEBlock on the flat feature vector (unsqueezed to 4-D)
        3. classifier — Linear(512) → BN → LeakyReLU → Dropout(0.5)
                        → Linear(256) → LeakyReLU → Dropout(0.3)
                        → Linear(num_classes)
    """

    def __init__(
        self,
        num_classes: int = 3,
        use_pretrained_backbone: bool = False,   # False at inference (weights come from .pth)
    ) -> None:
        """Build the PreRegNet_SE model."""
        super().__init__()

        # ── 1. Backbone ──────────────────────────────────────────────
        weights = RegNet_Y_400MF_Weights.IMAGENET1K_V1 if use_pretrained_backbone else None
        backbone = regnet_y_400mf(weights=weights)
        in_features: int = backbone.fc.in_features  # 440 for RegNetY-400MF
        backbone.fc = nn.Identity()                 # remove original classifier
        self.backbone = backbone

        # ── 2. SE attention block (paper modification) ───────────────
        self.se = SEBlock(in_features, ratio=0.25)

        # ── 3. Classification head ───────────────────────────────────
        self.classifier = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Run a forward pass through the full model."""
        # Feature extraction via backbone
        x = self.backbone(x)                       # [B, in_features]

        # Safety: if backbone accidentally returns a 4-D map, flatten it
        if x.dim() == 4:
            x = torch.mean(x, dim=[2, 3])          # [B, C, H, W] → [B, C]

        # SE attention (block expects [B, C, 1, 1])
        x = x.unsqueeze(-1).unsqueeze(-1)          # [B, C] → [B, C, 1, 1]
        x = self.se(x)                             # apply channel attention
        x = x.squeeze(-1).squeeze(-1)              # [B, C, 1, 1] → [B, C]

        # Classification
        return self.classifier(x)