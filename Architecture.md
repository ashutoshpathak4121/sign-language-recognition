# Architecture

**Project:** Sign Language Detection
**Stack:** Flask, YOLOv5, HTML/CSS/Bootstrap, jQuery/AJAX, Docker, GitHub Actions, AWS ECR and EC2
**Last updated:** 2026-09-20

This document describes how the system is built. Product behaviour lives in PRD.md, coding conventions in Rules.md, and the interface in Design.md.

---

## 1. System overview

The browser sends one image at a time to a Flask server. Flask saves the image, runs YOLOv5 on it, and returns the annotated image. Live camera mode is the same flow repeated: the browser captures a frame, sends it, shows the result, then captures the next frame.

```
 Browser (HTML/CSS/Bootstrap + jQuery)
   |   upload image  or  camera frame (canvas -> JPEG -> Base64)
   |   HTTP POST /predict   {"image": "<base64>"}
   v
 Flask app (app.py, port 8080)
   |   decodeImage()  ->  data/inputImage.jpg
   |   subprocess: python yolov5/detect.py
   v
 YOLOv5 (best.pt, 416x416, conf 0.5)
   |   writes  yolov5/runs/detect/exp/inputImage.jpg
   v
 Flask app
   |   encodeImageIntoBase64()
   v
 Browser   <-  {"image": "<base64 annotated image>"}
```

## 2. Layers

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| User interface | HTML, CSS, Bootstrap 5 (grid only), JavaScript with jQuery/AJAX | Pick or capture an image, call the API, show the result and errors |
| Application server | Flask, Flask-CORS, port 8080 | Routes, input validation, orchestration, Base64 encode/decode |
| Helper package | `signLanguage/utils/main_utils.py` | `decodeImage()` and `encodeImageIntoBase64()` |
| Model | YOLOv5 (PyTorch), `best.pt` | Object detection on hand signs |
| Storage | Local folders `data/` and `yolov5/runs/detect/exp/` | Temporary input and output images |
| CI/CD and hosting | GitHub Actions, Docker, AWS ECR, EC2 self-hosted runner | Test, build, publish, deploy |

## 3. Repository structure

```
sign-language-detection/
├── app.py                        # Flask server
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .gitignore
├── README.md
├── PRD.md  Architecture.md  Rules.md  Design.md  Tasks.md  Memory.md
│
├── .github/workflows/main.yaml   # CI, build, push, deploy
│
├── signLanguage/
│   ├── __init__.py
│   └── utils/
│       ├── __init__.py
│       └── main_utils.py         # decodeImage, encodeImageIntoBase64
│
├── yolov5/                       # cloned from ultralytics/yolov5
│   ├── detect.py
│   ├── best.pt                   # trained weights
│   └── runs/detect/exp/          # detection output (auto-created, git-ignored)
│
├── data/
│   └── inputImage.jpg            # current uploaded image (git-ignored)
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/style.css
│   └── js/app.js
│
├── tests/
│   ├── test_main_utils.py
│   └── test_api.py
│
└── notebooks/
    └── train_yolov5.ipynb        # Colab training notebook
```

## 4. Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Home page. Serves `templates/index.html` with the upload mode active. |
| GET | `/live` | Same page with the live camera mode active. Uses the browser camera and calls `/predict`. |
| POST | `/predict` | Runs detection on one image and returns the annotated image. |
| GET | `/health` | Returns `{"status": "ok"}` for deployment checks (v1.1). |

### Why `/live` does not run `detect.py --source 0`

`--source 0` opens the camera attached to the **server**. On a laptop that is the user's own camera, but on EC2 there is no camera, so it fails. Instead, the browser captures frames with `getUserMedia` and posts them to `/predict`.

## 5. API contract

### `POST /predict`

**Request**
```json
{ "image": "<Base64 of a JPEG or PNG, without the 'data:image/...;base64,' prefix>" }
```
Headers: `Content-Type: application/json`. Maximum body size: 5 MB.

**Response 200 (v1)**
```json
{ "image": "<Base64 JPEG of the annotated image>" }
```

**Response 200 (v1.1, additive, existing clients keep working)**
```json
{
  "image": "<Base64 JPEG of the annotated image>",
  "detections": [
    { "label": "B", "confidence": 0.93, "box": [x1, y1, x2, y2] }
  ]
}
```
`detections` is an empty list when nothing is found. Detections come from `detect.py --save-txt --save-conf`.

**Errors**

| Status | Body | When |
|--------|------|------|
| 400 | `{"error": "Missing 'image' field."}` | No image in the request |
| 400 | `{"error": "Image could not be read."}` | Base64 or image data is invalid |
| 413 | `{"error": "Image is larger than 5 MB."}` | Body too large |
| 500 | `{"error": "Detection failed. Try again."}` | Model or subprocess error. Details are logged, not returned. |

## 6. Request sequence (upload mode)

1. The user selects a file. JavaScript reads it with `FileReader` and strips the data-URL prefix.
2. jQuery `$.ajax` sends `POST /predict` with `{image}`.
3. Flask validates the payload, then `decodeImage()` writes `data/inputImage.jpg`.
4. Flask clears the previous `yolov5/runs` folder.
5. Flask runs `detect.py` with `--weights yolov5/best.pt --img 416 --conf 0.5 --source data/inputImage.jpg`.
6. `encodeImageIntoBase64()` reads `yolov5/runs/detect/exp/inputImage.jpg`.
7. Flask returns the JSON. The browser sets it as the source of the result `<img>`.

## 7. Live mode design

- The browser draws a video frame to a hidden `<canvas>`, scaled so the longest side is at most 640 px, and exports it as JPEG at quality 0.8.
- One request in flight at a time. The next frame is sent after the previous response arrives, and no sooner than 500 ms after the last send.
- A **Stop camera** button calls `track.stop()` on every media track.
- If a request fails, live mode pauses and shows an error with a **Try again** action. It never retries in a silent loop.
- Browsers require HTTPS for `getUserMedia` (except on `localhost`).

## 8. Model

| Item | Value |
|------|-------|
| Framework | YOLOv5 (Ultralytics), PyTorch |
| Weights | `yolov5/best.pt`, trained in Colab |
| Input size | 416 x 416 |
| Confidence threshold | 0.5 |
| Classes | 26 (A-Z). Class names live in the dataset `data.yaml` and are embedded in `best.pt`. |
| Training command | `python train.py --img 416 --batch 16 --epochs 50 --data data.yaml --weights yolov5s.pt` |

Model updates replace `best.pt` only. No app code should change when the weights change, as long as the class list stays the same.

## 9. Deployment

```
push to main
   |
   v
[1] Integration job (GitHub-hosted runner): install, lint, run tests
   |
   v
[2] Build job: docker build -> push image to AWS ECR
   |
   v
[3] Deploy job (self-hosted runner on EC2): pull image from ECR,
    stop and remove the old container, run the new one on port 8080
```

**GitHub repository secrets**

| Secret | Use |
|--------|-----|
| `AWS_ACCESS_KEY_ID` | Push to and pull from ECR |
| `AWS_SECRET_ACCESS_KEY` | Same |
| `AWS_REGION` | ECR region |
| `ECR_REPOSITORY_NAME` | Image repository name |
| `AWS_ECR_LOGIN_URI` | ECR registry URI |

**EC2 notes**
- Install Docker and register the instance as a GitHub self-hosted runner.
- Security group: allow 80/443 from the internet. Keep 8080 closed to the public if a reverse proxy is used.
- Put a TLS-terminating proxy (Nginx, Caddy, or an ALB) in front so the camera works in browsers.
- Use an IAM role with the minimum ECR permissions instead of broad keys where possible.

**Container**
- Base image `python:3.10-slim` plus `libgl1` and `libglib2.0-0` for OpenCV.
- Runs as a non-root user, exposes 8080, and uses a health check on `/health` (v1.1).

## 10. Security and privacy

| Concern | Decision |
|---------|----------|
| Untrusted images | Enforce `MAX_CONTENT_LENGTH` of 5 MB. Decode with Pillow and reject anything that is not a valid JPEG or PNG. |
| Command injection | The `subprocess.run` argument list is fixed. User input is never placed in the command. |
| CORS | `CORS(app)` is fine for local work. In production, restrict origins to the site's domain. |
| Debug mode | Never `debug=True` in production. |
| Secrets | Only in GitHub secrets or environment variables. Never in the repo or image. |
| Privacy | Images are stored only as `data/inputImage.jpg` and overwritten by the next request. They are not logged. The page tells users that images are sent to the server. |

## 11. Known limitations (v1)

| Limitation | Effect | Fix planned |
|------------|--------|-------------|
| Fixed file name `inputImage.jpg` and fixed output folder | Two simultaneous users can see each other's results | Unique request ID per file, `--project` and `--name` per request, delete after reply (v1.1) |
| `detect.py` runs as a new process per request | Model loads every time, so each call is slow | Load the model once at startup with `torch.hub.load` or the YOLOv5 API (v1.1) |
| `shutil.rmtree("yolov5/runs")` on every request | Not safe with concurrency | Removed together with the fix above |
| Only the annotated image is returned | Text and screen readers cannot read the result | Add `detections` list (v1.1) |
| CPU inference | Live mode is a few frames per second at best | Smaller frames, ONNX runtime, or a GPU instance (v2) |

## 12. Decision log

| # | Decision | Reason |
|---|----------|--------|
| D1 | Flask and YOLOv5 instead of Next.js, TensorFlow.js, and MediaPipe | Matches the chosen architecture diagram. Simpler to build and deploy. |
| D2 | Use `subprocess.run` with an argument list instead of `os.system` | Safer, and raises an error when detection fails. |
| D3 | `/live` uses browser-captured frames | The server has no camera. |
| D4 | Base64 JSON for transport | Simple with jQuery/AJAX. Costs about 33% more bytes than multipart upload, which is acceptable at 640 px. |
| D5 | Bootstrap for grid only, custom CSS for everything else | Keeps the interface distinctive, see Design.md. |
| D6 | Local files instead of a database | No user data to store in v1. |
