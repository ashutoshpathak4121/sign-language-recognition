"""
API tests for Flask Sign Language Detection application.
"""

import base64
import io
from PIL import Image
import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_base64_image():
    """Generate a clean base64 encoded test image."""
    buffer = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(120, 200, 150))
    img.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def test_home_route(client):
    """Test GET / returns status 200 and loads HTML with upload mode."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Signal Frame" in response.data
    assert b"Show a sign. See what it says." in response.data


def test_live_route(client):
    """Test GET /live returns status 200 and renders live camera mode."""
    response = client.get("/live")
    assert response.status_code == 200
    assert b"Start camera" in response.data


def test_health_route(client):
    """Test GET /health returns status 200 and ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_predict_missing_image_payload(client):
    """Test POST /predict without image field returns 400 error."""
    response = client.post("/predict", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Missing 'image' field."


def test_predict_invalid_image_data(client):
    """Test POST /predict with invalid base64 string returns 400 error."""
    response = client.post("/predict", json={"image": "invalid_base64_corrupt_data"})
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Image could not be read."


def test_predict_valid_image(client, sample_base64_image):
    """Test POST /predict with valid base64 image runs inference and returns 200 with detections."""
    response = client.post("/predict", json={"image": sample_base64_image})
    assert response.status_code == 200
    data = response.get_json()
    assert "image" in data
    assert "detections" in data
    assert isinstance(data["detections"], list)
