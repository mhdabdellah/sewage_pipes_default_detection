"""Remote image prediction endpoint tests."""

from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock

from PIL import Image

import app as app_module


def create_test_image_bytes() -> bytes:
    """Create a 1x1 white JPEG image in memory."""
    image = Image.new("RGB", (1, 1), color="white")
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_predict_url_valid(client: object, monkeypatch: object) -> None:
    """POST /predict-url should accept a valid remote image."""
    mock_response = MagicMock()
    mock_response.headers = {"Content-Type": "image/jpeg"}
    mock_response.content = create_test_image_bytes()
    mock_response.raise_for_status = MagicMock()

    monkeypatch.setattr(app_module.requests, "get", lambda *args, **kwargs: mock_response)

    response = client.post("/predict-url", json={"image_url": "https://example.com/image.jpg"})
    payload = response.get_json()

    assert response.status_code == 200
    assert {"class_name", "class_id", "confidence", "probabilities"} <= payload.keys()


def test_predict_url_missing_field(client: object) -> None:
    """POST /predict-url should reject missing image_url values."""
    response = client.post("/predict-url", json={})
    assert response.status_code == 400
