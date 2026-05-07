"""Flask REST API for sewer pipe defect classification."""

from __future__ import annotations

import logging
import os
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
import torch
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from requests import Response as RequestsResponse
from requests import exceptions as requests_exceptions
from torchvision import transforms
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import RequestEntityTooLarge

from model import PreRegNet_SE   # ← updated import

CLASS_NAMES = ["Root Intrusion", "Sediment Blockage", "Structural Cracks"]
IMAGE_SIZE = (224, 224)
MAX_FILE_SIZE = 10 * 1024 * 1024
DEFAULT_MODEL_PATH = "./PreRegNet_SE_model.pth"


# ─────────────────────────────────────────────────────────────────────────────
# Custom exception
# ─────────────────────────────────────────────────────────────────────────────

class APIError(Exception):
    """Structured API exception with an HTTP status code."""

    def __init__(self, message: str, status_code: int, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


# ─────────────────────────────────────────────────────────────────────────────
# Model service
# ─────────────────────────────────────────────────────────────────────────────

class ModelService:
    """Loads PreRegNet_SE once at startup and exposes a predict method."""

    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = transforms.ToTensor()
        self.model: PreRegNet_SE | None = None
        self.load_error: str | None = None
        self._load_model()

    @property
    def device_label(self) -> str:
        return self.device.type

    def is_loaded(self) -> bool:
        return self.model is not None

    def _load_model(self) -> None:
        """Instantiate PreRegNet_SE and load the saved checkpoint."""
        try:
            # Build the architecture WITHOUT pretrained backbone weights —
            # all weights (including backbone) come from the .pth file.
            model = PreRegNet_SE(num_classes=len(CLASS_NAMES), use_pretrained_backbone=False)

            checkpoint = torch.load(self.model_path, map_location=self.device)
            state_dict = self._extract_state_dict(checkpoint)

            model.load_state_dict(state_dict, strict=True)
            model.to(self.device)
            model.eval()
            self.model = model
            self.load_error = None
            logging.getLogger(__name__).info(
                "PreRegNet_SE loaded from %s on %s", self.model_path, self.device_label
            )
        except Exception as exc:
            self.model = None
            self.load_error = str(exc)
            logging.getLogger(__name__).exception(
                "Failed to load model from %s", self.model_path
            )

    @staticmethod
    def _extract_state_dict(checkpoint: Any) -> dict[str, torch.Tensor]:
        """Normalise various checkpoint formats into a plain state dict.

        The notebook saves the model with torch.save(model.state_dict(), path)
        so the checkpoint is already a flat dict — this handles that case plus
        the common alternatives just in case.
        """
        if isinstance(checkpoint, torch.nn.Module):
            raw = checkpoint.state_dict()
        elif isinstance(checkpoint, dict):
            # Try common wrapper keys first; fall back to the dict itself
            raw = (
                checkpoint.get("state_dict")
                or checkpoint.get("model_state_dict")
                or checkpoint
            )
        else:
            raise TypeError(f"Unsupported checkpoint type: {type(checkpoint)}")

        if not isinstance(raw, dict):
            raise TypeError("Checkpoint does not contain a valid state dict.")

        # Strip any DataParallel / DistributedDataParallel prefix
        cleaned: dict[str, torch.Tensor] = {
            key.removeprefix("module."): value for key, value in raw.items()
        }
        return cleaned

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Resize → RGB → tensor."""
        resized = image.convert("RGB").resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
        return self.transform(resized)  # [3, 224, 224], values in [0, 1]

    def predict_image(self, image: Image.Image) -> dict[str, Any]:
        """Run inference and return a structured result dict."""
        if self.model is None:
            raise APIError(
                "Model is not loaded.",
                500,
                {"device": self.device_label, "details": self.load_error or "Unknown error."},
            )

        tensor = self.preprocess_image(image).unsqueeze(0).to(self.device)  # [1, 3, 224, 224]

        with torch.no_grad():
            logits = self.model(tensor)                              # [1, num_classes]
            probs = torch.softmax(logits, dim=1).squeeze(0)         # [num_classes]

        class_id = int(torch.argmax(probs).item())
        prob_list = [float(p.item()) for p in probs]

        return {
            "class_name": CLASS_NAMES[class_id],
            "class_id": class_id,
            "confidence": prob_list[class_id],
            "probabilities": prob_list,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Flask app factory
# ─────────────────────────────────────────────────────────────────────────────

def create_app() -> Flask:
    application = Flask(__name__)
    application.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

    CORS(application, resources={r"/*": {"origins": ["http://localhost:3000"]}})
    _register_error_handlers(application)
    _register_routes(application)
    return application


def _register_routes(application: Flask) -> None:

    @application.get("/health")
    def health() -> tuple[Response, int]:
        """Return API and model health status."""
        if not MODEL_SERVICE.is_loaded():
            raise APIError(
                "Model failed to load.",
                500,
                {
                    "model": "unavailable",
                    "device": MODEL_SERVICE.device_label,
                    "details": MODEL_SERVICE.load_error,
                },
            )
        return jsonify({"status": "ok", "model": "loaded", "device": MODEL_SERVICE.device_label}), 200

    @application.post("/predict")
    def predict() -> tuple[Response, int]:
        """Run inference on an uploaded image file."""
        uploaded_file = request.files.get("image")
        if uploaded_file is None:
            raise APIError("Missing required file field 'image'.", 400)
        image = _load_image_from_upload(uploaded_file)
        return jsonify(MODEL_SERVICE.predict_image(image)), 200

    @application.post("/predict-url")
    def predict_url() -> tuple[Response, int]:
        """Download an image from a URL and run inference on it."""
        payload = request.get_json(silent=True) or {}
        image_url = payload.get("image_url")
        if not isinstance(image_url, str) or not image_url.strip():
            raise APIError("Missing required JSON field 'image_url'.", 400)
        image = _load_image_from_url(image_url.strip())
        return jsonify(MODEL_SERVICE.predict_image(image)), 200


def _register_error_handlers(application: Flask) -> None:

    @application.errorhandler(APIError)
    def handle_api_error(error: APIError) -> tuple[Response, int]:
        return _json_error(error.message, error.status_code, error.details)

    @application.errorhandler(RequestEntityTooLarge)
    def handle_too_large(_error: RequestEntityTooLarge) -> tuple[Response, int]:
        return _json_error("Image size must be smaller than 10 MB.", 413)

    @application.errorhandler(Exception)
    def handle_unexpected(error: Exception) -> tuple[Response, int]:
        application.logger.exception("Unhandled error: %s", error)
        return _json_error("Internal server error.", 500)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _json_error(message: str, status_code: int, details: dict[str, Any] | None = None) -> tuple[Response, int]:
    payload: dict[str, Any] = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status_code


def _validate_image_content_type(content_type: str | None) -> None:
    if not content_type or not content_type.startswith("image/"):
        raise APIError("Only image uploads are supported.", 400)


def _load_image_from_upload(uploaded_file: FileStorage) -> Image.Image:
    _validate_image_content_type(uploaded_file.mimetype)
    file_bytes = uploaded_file.read()
    if not file_bytes:
        raise APIError("Uploaded image is empty.", 400)
    if len(file_bytes) > MAX_FILE_SIZE:
        raise APIError("Image size must be smaller than 10 MB.", 413)
    return _decode_image(file_bytes)


def _load_image_from_url(image_url: str) -> Image.Image:
    response = _fetch_url(image_url)
    _validate_image_content_type(response.headers.get("Content-Type"))
    content_length = response.headers.get("Content-Length", "0")
    if _parse_int(content_length) > MAX_FILE_SIZE or len(response.content) > MAX_FILE_SIZE:
        raise APIError("Image size must be smaller than 10 MB.", 413)
    return _decode_image(response.content)


def _fetch_url(image_url: str) -> RequestsResponse:
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        return response
    except requests_exceptions.RequestException as exc:
        raise APIError("Unable to fetch image from the provided URL.", 400, {"details": str(exc)}) from exc


def _parse_int(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return 0


def _decode_image(image_bytes: bytes) -> Image.Image:
    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img.load()
            return img.copy()
    except UnidentifiedImageError as exc:
        raise APIError("The provided file is not a valid image.", 400) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Application entry point
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
MODEL_SERVICE = ModelService(Path(os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)))
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)