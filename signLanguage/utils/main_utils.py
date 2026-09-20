"""
Image encoding and decoding utilities for Sign Language Detection.
"""

import base64
import os
from pathlib import Path


def decodeImage(imgstring: str, fileName: str) -> None:
    """Decode a base64 encoded image string and save it to a destination file path.

    Args:
        imgstring: Base64 encoded image string (with or without data URL header).
        fileName: Output file path where decoded bytes will be written.
    """
    if "," in imgstring:
        imgstring = imgstring.split(",", 1)[1]

    img_data = base64.b64decode(imgstring)
    output_path = Path(fileName)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "wb") as f:
        f.write(img_data)


def encodeImageIntoBase64(croppedImagePath: str) -> str:
    """Read an image from disk and return its base64 encoded string.

    Args:
        croppedImagePath: Path to the image file to be encoded.

    Returns:
        Base64 encoded string representation of the image.
    """
    if not os.path.exists(croppedImagePath):
        raise FileNotFoundError(f"Image not found at path: {croppedImagePath}")

    with open(croppedImagePath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")
