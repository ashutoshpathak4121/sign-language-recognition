"""
Unit tests for signLanguage.utils.main_utils
"""

import base64
import os
import tempfile
from pathlib import Path
from PIL import Image
import pytest

from signLanguage.utils.main_utils import decodeImage, encodeImageIntoBase64


@pytest.fixture
def sample_image_file():
    """Create a temporary dummy image for test cases."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        img = Image.new("RGB", (64, 64), color=(73, 109, 137))
        img.save(tmp.name, "JPEG")
        tmp_path = tmp.name

    yield tmp_path

    if os.path.exists(tmp_path):
        os.remove(tmp_path)


def test_encode_and_decode_roundtrip(sample_image_file):
    """Test that encoding an image and decoding it back results in a valid image file."""
    # 1. Encode
    b64_str = encodeImageIntoBase64(sample_image_file)
    assert isinstance(b64_str, str)
    assert len(b64_str) > 0

    # 2. Decode to new destination
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as output_tmp:
        out_path = output_tmp.name

    try:
        decodeImage(b64_str, out_path)
        assert os.path.exists(out_path)
        assert os.path.getsize(out_path) > 0

        # Verify readable with Pillow
        with Image.open(out_path) as img:
            img.verify()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


def test_decode_image_with_data_url_prefix():
    """Test decodeImage when the base64 string contains a data:image prefix."""
    img_data = b"testdata123"
    b64_payload = "data:image/jpeg;base64," + base64.b64encode(img_data).decode("utf-8")

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        out_path = tmp.name

    try:
        decodeImage(b64_payload, out_path)
        with open(out_path, "rb") as f:
            read_bytes = f.read()
        assert read_bytes == img_data
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


def test_encode_missing_file_raises_error():
    """Test that attempting to encode a non-existent file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        encodeImageIntoBase64("non_existent_image_path_12345.jpg")
