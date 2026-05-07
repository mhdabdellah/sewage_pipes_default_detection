"""Health endpoint tests."""

from __future__ import annotations


def test_health_returns_200(client: object) -> None:
    """GET /health should return HTTP 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_json(client: object) -> None:
    """GET /health should report an ok status."""
    response = client.get("/health")
    assert response.get_json()["status"] == "ok"
