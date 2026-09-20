"""
Flask Application for Sign Language Detection.

Provides web routes for image upload, live camera feed recognition, and API endpoints
for YOLOv5 object detection.
"""

import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

from signLanguage.utils.main_utils import decodeImage, encodeImageIntoBase64

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("sign_language_app")

app = Flask(__name__)
CORS(app)

# Configuration from environment variables
PORT = int(os.environ.get("PORT", 8080))
HOST = os.environ.get("HOST", "0.0.0.0")
WEIGHTS_PATH = os.environ.get("WEIGHTS_PATH", "yolov5/best.pt")
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", 0.5))
IMG_SIZE = int(os.environ.get("IMG_SIZE", 416))
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB limit

# ASL class mapping (26 letters A-Z)
CLASS_NAMES = [chr(i) for i in range(ord("A"), ord("Z") + 1)]


def parse_detections_txt(labels_txt_path: Path) -> list:
    """Parse YOLO formatted label file and return structured detection dictionaries.

    Format: <class_id> <x_center> <y_center> <width> <height> [<confidence>]
    """
    detections = []
    if not labels_txt_path.exists():
        return detections

    try:
        with open(labels_txt_path, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    xc = float(parts[1])
                    yc = float(parts[2])
                    w = float(parts[3])
                    h = float(parts[4])
                    conf = float(parts[5]) if len(parts) >= 6 else 1.0

                    label = CLASS_NAMES[cls_id] if 0 <= cls_id < len(CLASS_NAMES) else f"Sign {cls_id}"
                    x1 = max(0.0, xc - w / 2)
                    y1 = max(0.0, yc - h / 2)
                    x2 = min(1.0, xc + w / 2)
                    y2 = min(1.0, yc + h / 2)

                    detections.append(
                        {
                            "label": label,
                            "confidence": round(conf, 2),
                            "box": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)],
                        }
                    )
    except Exception as e:
        logger.warning(f"Error parsing detections text file: {e}")

    # Sort descending by confidence
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return detections


@app.route("/", methods=["GET"])
def home():
    """Render home page with image upload mode active."""
    return render_template("index.html", mode="upload")


@app.route("/live", methods=["GET"])
def live():
    """Render home page with live camera mode active."""
    return render_template("index.html", mode="live")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for container and deployment liveness."""
    return jsonify({"status": "ok"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    """Run sign language detection on a base64 encoded input image.

    Expects JSON: { "image": "<base64_encoded_jpeg_or_png>" }
    Returns JSON: { "image": "<base64_encoded_annotated_jpeg>", "detections": [...] }
    """
    data = request.get_json(silent=True)
    if not data or "image" not in data or not data["image"]:
        logger.warning("Predict request missing 'image' field")
        return jsonify({"error": "Missing 'image' field."}), 400

    img_b64 = data["image"]

    # Check payload size (approximate Base64 size to byte length)
    estimated_size = (len(img_b64) * 3) / 4
    if estimated_size > MAX_CONTENT_LENGTH:
        logger.warning(f"Payload exceeded size limit: {estimated_size} bytes")
        return jsonify({"error": "Image is larger than 5 MB."}), 413

    input_path = Path("data/inputImage.jpg")
    input_path.parent.mkdir(parents=True, exist_ok=True)

    # Decode and validate image
    try:
        decodeImage(img_b64, str(input_path))
        with Image.open(input_path) as img:
            img.verify()
        # Re-open and convert to RGB JPEG to ensure clean encoding
        with Image.open(input_path) as img:
            rgb_img = img.convert("RGB")
            rgb_img.save(input_path, "JPEG")
    except Exception as e:
        logger.warning(f"Failed to decode or verify input image: {e}")
        return jsonify({"error": "Image could not be read."}), 400

    # Prepare YOLOv5 detection output directory
    output_dir = Path("yolov5/runs/detect/exp")
    if output_dir.exists():
        shutil.rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Subprocess execution of YOLOv5 inference
    detect_script = Path("yolov5/detect.py")
    cmd = [
        sys.executable,
        str(detect_script),
        "--weights",
        WEIGHTS_PATH,
        "--img",
        str(IMG_SIZE),
        "--conf",
        str(CONF_THRESHOLD),
        "--source",
        str(input_path),
        "--project",
        "yolov5/runs/detect",
        "--name",
        "exp",
        "--exist-ok",
        "--save-txt",
        "--save-conf",
    ]

    try:
        logger.info(f"Running detection command on {input_path}")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=30,
        )
        logger.debug(f"Subprocess output: {result.stdout}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Detection subprocess failed with code {e.returncode}: {e.stderr}")
        return jsonify({"error": "Detection failed. Try again."}), 500
    except subprocess.TimeoutExpired:
        logger.error("Detection subprocess timed out")
        return jsonify({"error": "Detection failed. Try again."}), 500
    except Exception as e:
        logger.error(f"Unexpected error during detection: {e}")
        return jsonify({"error": "Detection failed. Try again."}), 500

    output_img_path = output_dir / "inputImage.jpg"
    if not output_img_path.exists():
        logger.error(f"Annotated output image not found at {output_img_path}")
        return jsonify({"error": "Detection failed. Try again."}), 500

    try:
        annotated_b64 = encodeImageIntoBase64(str(output_img_path))
        labels_txt_path = output_dir / "labels" / "inputImage.txt"
        detections = parse_detections_txt(labels_txt_path)

        return jsonify(
            {
                "image": annotated_b64,
                "detections": detections,
            }
        ), 200
    except Exception as e:
        logger.error(f"Error preparing detection response: {e}")
        return jsonify({"error": "Detection failed. Try again."}), 500


if __name__ == "__main__":
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info(f"Starting Sign Language Detection server on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=is_debug)
