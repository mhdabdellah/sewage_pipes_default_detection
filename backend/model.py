"""Model definitions for the PipeVision classifier."""

from __future__ import annotations

import torch
from torch import nn
from torchvision.models import RegNet_Y_400MF_Weights, regnet_y_400mf


class SEBlock(nn.Module):
    """Squeeze-and-excitation block applied to convolutional feature maps."""

    def __init__(self, channels: int, reduction: int = 4) -> None:
        """Initialize the SE block."""
        super().__init__()
        hidden_channels = max(channels // reduction, 1)

        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Conv2d(channels, hidden_channels, kernel_size=1)
        self.relu = nn.ReLU(inplace=True)
        self.fc2 = nn.Conv2d(hidden_channels, channels, kernel_size=1)
        self.gate = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Scale each channel using learned squeeze-and-excitation weights."""
        scale = self.pool(x)
        scale = self.fc1(scale)
        scale = self.relu(scale)
        scale = self.fc2(scale)
        scale = self.gate(scale)
        return x * scale


class RegNetPlus(nn.Module):
    """RegNet-Y-400MF backbone with SE attention and a custom classification head."""

    def __init__(self, num_classes: int = 3, use_pretrained_backbone: bool = True) -> None:
        """Build the RegNetPlus architecture."""
        super().__init__()
        weights = RegNet_Y_400MF_Weights.IMAGENET1K_V2 if use_pretrained_backbone else None
        backbone = regnet_y_400mf(weights=weights)
        feature_dim = backbone.fc.in_features

        self.stem = backbone.stem
        self.trunk_output = backbone.trunk_output
        self.se_block = SEBlock(feature_dim)
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Linear(feature_dim, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Run a forward pass through the network."""
        x = self.stem(x)
        x = self.trunk_output(x)
        x = self.se_block(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)
