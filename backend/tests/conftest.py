"""Shared pytest fixtures for backend API tests."""

from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import MagicMock

import pytest
import torch
from flask.testing import FlaskClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app as app_module


@pytest.fixture(autouse=True)
def mock_model() -> MagicMock:
    """Patch the global model singleton so tests avoid real weights."""
    mock_model_instance = MagicMock()
    mock_model_instance.return_value = torch.tensor([[10.0, 1.0, 1.0]], dtype=torch.float32)

    app_module.MODEL_SERVICE.model = mock_model_instance
    app_module.MODEL_SERVICE.load_error = None
    app_module.MODEL_SERVICE.device = torch.device("cpu")

    return mock_model_instance


@pytest.fixture()
def client() -> Iterator[FlaskClient]:
    """Create a Flask test client."""
    with app_module.app.test_client() as test_client:
        yield test_client
