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

from model import RegNetPlus

CLASS_NAMES = ["Root Intrusion", "Sediment Blockage", "Structural Cracks"]
IMAGE_SIZE = (224, 224)
MAX_FILE_SIZE = 10 * 1024 * 1024
DEFAULT_MODEL_PATH = "./PreRegNet_SE_model.pth"


class APIError(Exception):
    """Structured API exception with an HTTP status code."""

    def __init__(self, message: str, status_code: int, details: dict[str, Any] | None = None) -> None:
        """Create an API error."""
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ModelService:
    """Singleton-style model loader and predictor."""

    def __init__(self, model_path: Path) -> None:
        """Initialize the model service and load the model once."""
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = transforms.ToTensor()
        self.model: RegNetPlus | None = None
        self.load_error: str | None = None
        self._load_model()

    @property
    def device_label(self) -> str:
        """Return the active device label."""
        return self.device.type

    def is_loaded(self) -> bool:
        """Return whether the model weights were loaded successfully."""
        return self.model is not None

    def _load_model(self) -> None:
        """Load the trained checkpoint into memory."""
        try:
            model = RegNetPlus(num_classes=len(CLASS_NAMES), use_pretrained_backbone=False)
            checkpoint = torch.load(self.model_path, map_location=self.device)
            state_dict = self._extract_state_dict(checkpoint)
            model.load_state_dict(state_dict, strict=True)
            model.to(self.device)
            model.eval()
            self.model = model
            self.load_error = None
        except Exception as exc:  # pragma: no cover - exercised indirectly
            self.model = None
            self.load_error = str(exc)
            logging.getLogger(__name__).exception("Failed to load model from %s", self.model_path)

    def _extract_state_dict(self, checkpoint: Any) -> dict[str, torch.Tensor]:
        """Normalize checkpoint formats into a plain state dict."""
        if isinstance(checkpoint, torch.nn.Module):
            raw_state_dict = checkpoint.state_dict()
        elif isinstance(checkpoint, dict):
            raw_state_dict = checkpoint.get("state_dict") or checkpoint.get("model_state_dict") or checkpoint
        else:
            raise TypeError("Unsupported checkpoint format.")

        if not isinstance(raw_state_dict, dict):
            raise TypeError("Checkpoint does not contain a valid state dict.")

        cleaned_state_dict: dict[str, torch.Tensor] = {}
        for key, value in raw_state_dict.items():
            normalized_key = key.removeprefix("module.").removeprefix("backbone.")
            # Handle SE block key differences
            if normalized_key.startswith("se."):
                if "fc.0." in normalized_key:
                    normalized_key = normalized_key.replace("se.fc.0.", "se_block.fc1.")
                elif "fc.2." in normalized_key:
                    normalized_key = normalized_key.replace("se.fc.2.", "se_block.fc2.")
                else:
                    normalized_key = normalized_key.replace("se.", "se_block.")
            cleaned_state_dict[normalized_key] = value
        return cleaned_state_dict

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Resize and convert the image into a model-ready tensor."""
        resized_image = image.convert("RGB").resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
        return self.transform(resized_image)

    def predict_image(self, image: Image.Image) -> dict[str, Any]:
        """Run inference and return a structured prediction payload."""
        if self.model is None:
            raise APIError(
                "Model is not loaded.",
                500,
                {"device": self.device_label, "details": self.load_error or "Unknown model load error."},
            )

        input_tensor = self.preprocess_image(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(input_tensor)
            probabilities = torch.softmax(logits, dim=1).squeeze(0)

        class_id = int(torch.argmax(probabilities).item())
        probability_values = [float(value.item()) for value in probabilities]

        return {
            "class_name": CLASS_NAMES[class_id],
            "class_id": class_id,
            "confidence": probability_values[class_id],
            "probabilities": probability_values,
        }


def create_app() -> Flask:
    """Configure and return the Flask application."""
    application = Flask(__name__)
    application.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

    CORS(application, resources={r"/*": {"origins": ["http://localhost:3000"]}})
    register_error_handlers(application)
    register_routes(application)
    return application


def register_routes(application: Flask) -> None:
    """Register application routes."""

    @application.get("/health")
    def health() -> tuple[Response, int]:
        """Return the API and model health status."""
        if not MODEL_SERVICE.is_loaded():
            raise APIError(
                "Model failed to load.",
                500,
                {"model": "unavailable", "device": MODEL_SERVICE.device_label, "details": MODEL_SERVICE.load_error},
            )

        return (
            jsonify(
                {
                    "status": "ok",
                    "model": "loaded",
                    "device": MODEL_SERVICE.device_label,
                }
            ),
            200,
        )

    @application.post("/predict")
    def predict() -> tuple[Response, int]:
        """Run inference on an uploaded image."""
        uploaded_file = request.files.get("image")
        if uploaded_file is None:
            raise APIError("Missing required file field 'image'.", 400)

        image = load_image_from_upload(uploaded_file)
        prediction = MODEL_SERVICE.predict_image(image)
        return jsonify(prediction), 200

    @application.post("/predict-url")
    def predict_url() -> tuple[Response, int]:
        """Download an image from a URL and run inference on it."""
        payload = request.get_json(silent=True) or {}
        image_url = payload.get("image_url")

        if not isinstance(image_url, str) or not image_url.strip():
            raise APIError("Missing required JSON field 'image_url'.", 400)

        image = load_image_from_url(image_url.strip())
        prediction = MODEL_SERVICE.predict_image(image)
        return jsonify(prediction), 200


def register_error_handlers(application: Flask) -> None:
    """Register structured JSON error handlers."""

    @application.errorhandler(APIError)
    def handle_api_error(error: APIError) -> tuple[Response, int]:
        """Convert API errors into JSON responses."""
        return json_error(error.message, error.status_code, error.details)

    @application.errorhandler(RequestEntityTooLarge)
    def handle_request_too_large(error: RequestEntityTooLarge) -> tuple[Response, int]:
        """Return a JSON error for oversized uploads."""
        return json_error("Image size must be smaller than 10MB.", 413)

    @application.errorhandler(Exception)
    def handle_unexpected_error(error: Exception) -> tuple[Response, int]:
        """Catch unexpected exceptions and hide internal details."""
        application.logger.exception("Unhandled application error: %s", error)
        return json_error("Internal server error.", 500)


def json_error(message: str, status_code: int, details: dict[str, Any] | None = None) -> tuple[Response, int]:
    """Create a consistent JSON error payload."""
    payload: dict[str, Any] = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status_code


def validate_image_content_type(content_type: str | None) -> None:
    """Validate that the content type represents an image."""
    if not content_type or not content_type.startswith("image/"):
        raise APIError("Only image uploads are supported.", 400)


def load_image_from_upload(uploaded_file: FileStorage) -> Image.Image:
    """Validate an uploaded file and decode it as an image."""
    validate_image_content_type(uploaded_file.mimetype)
    file_bytes = uploaded_file.read()
    if not file_bytes:
        raise APIError("Uploaded image is empty.", 400)
    if len(file_bytes) > MAX_FILE_SIZE:
        raise APIError("Image size must be smaller than 10MB.", 413)
    return load_image_from_bytes(file_bytes)


def load_image_from_url(image_url: str) -> Image.Image:
    """Download an image from a remote URL and validate it."""
    response = fetch_image_response(image_url)
    validate_image_content_type(response.headers.get("Content-Type"))

    content_length = response.headers.get("Content-Length")
    if content_length and parse_content_length(content_length) > MAX_FILE_SIZE:
        raise APIError("Image size must be smaller than 10MB.", 413)
    if len(response.content) > MAX_FILE_SIZE:
        raise APIError("Image size must be smaller than 10MB.", 413)

    return load_image_from_bytes(response.content)


def fetch_image_response(image_url: str) -> RequestsResponse:
    """Fetch an image response from a remote URL."""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        return response
    except requests_exceptions.RequestException as exc:
        raise APIError("Unable to fetch image from the provided URL.", 400, {"details": str(exc)}) from exc


def parse_content_length(content_length: str) -> int:
    """Parse a content-length header value safely."""
    try:
        return int(content_length)
    except ValueError:
        return 0


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Decode image bytes into a Pillow image."""
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            return image.copy()
    except UnidentifiedImageError as exc:
        raise APIError("The provided file is not a valid image.", 400) from exc


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
MODEL_SERVICE = ModelService(Path(os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)))
app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
