"""Uploaded file prediction endpoint tests."""

from __future__ import annotations

from io import BytesIO

import pytest
from PIL import Image


def create_test_image_bytes() -> bytes:
    """Create a 1x1 white JPEG image in memory."""
    image = Image.new("RGB", (1, 1), color="white")
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_predict_valid_jpeg(client: object) -> None:
    """POST /predict should accept a valid JPEG image."""
    response = client.post(
        "/predict",
        data={"image": (BytesIO(create_test_image_bytes()), "sample.jpg", "image/jpeg")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()
    assert response.status_code == 200
    assert {"class_name", "class_id", "confidence", "probabilities"} <= payload.keys()
    assert len(payload["probabilities"]) == 3


def test_predict_no_file(client: object) -> None:
    """POST /predict should reject requests without an image."""
    response = client.post("/predict", data={}, content_type="multipart/form-data")
    assert response.status_code == 400


def test_predict_wrong_type(client: object) -> None:
    """POST /predict should reject non-image uploads."""
    response = client.post(
        "/predict",
        data={"image": (BytesIO(b"not-an-image"), "notes.txt", "text/plain")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_predict_class_id_is_zero(client: object) -> None:
    """Fixed mock logits should always map to class 0."""
    response = client.post(
        "/predict",
        data={"image": (BytesIO(create_test_image_bytes()), "sample.jpg", "image/jpeg")},
        content_type="multipart/form-data",
    )
    assert response.get_json()["class_id"] == 0


def test_predict_probabilities_sum_to_one(client: object) -> None:
    """Softmax probabilities should sum to one."""
    response = client.post(
        "/predict",
        data={"image": (BytesIO(create_test_image_bytes()), "sample.jpg", "image/jpeg")},
        content_type="multipart/form-data",
    )
    probabilities = response.get_json()["probabilities"]
    assert sum(probabilities) == pytest.approx(1.0, rel=1e-6)
