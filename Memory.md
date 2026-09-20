# Memory

**Project:** Sign Language Detection
**Purpose:** a running record of the project's state, decisions, and lessons, so anyone (or any AI assistant) starting a new session can pick up without re-explaining.

**How to use this file**
- Read it at the start of every session, after Rules.md.
- Update it at the end of every session: status, decisions, known issues, and a log entry.
- Keep entries short and factual. Record only measured results.

---

## 1. Project summary

A website where a user uploads a photo or uses a webcam, and a YOLOv5 model detects ASL alphabet signs and returns the annotated image. Built with Flask, HTML/CSS/Bootstrap, jQuery/AJAX, Docker, GitHub Actions, and AWS ECR and EC2.

Related documents: `PRD.md` (what and why), `Architecture.md` (how), `Rules.md` (conventions), `Design.md` (interface), `Tasks.md` (work list).

## 2. Current status

| Area | Status |
|------|--------|
| Planning and documents | Done |
| Repository and setup | Done |
| Model training | Ready (Google Colab notebook provided) |
| Backend (Flask) | Done (`app.py`, `signLanguage/utils/main_utils.py`) |
| Frontend | Done (`templates/index.html`, `static/css/style.css`, `static/js/app.js`) |
| Tests | Done (9/9 tests passing in `tests/`) |
| Docker | Done (`Dockerfile`, `.dockerignore`) |
| CI/CD and AWS | Done (`.github/workflows/main.yaml`) |

**Next step:** Train YOLOv5 weights in Colab (`notebooks/train_yolov5.ipynb`), place `best.pt` in `yolov5/`, and configure AWS ECR/EC2 runner.

## 3. Key facts

| Item | Value |
|------|-------|
| Server port | 8080 |
| Routes | `/`, `/live`, `POST /predict`, `/health` |
| Model | YOLOv5, `yolov5/best.pt`, input 416 x 416, confidence 0.5 |
| Classes | 26 letters, A to Z |
| Temporary input image | `data/inputImage.jpg` |
| Detection output | `yolov5/runs/detect/exp/inputImage.jpg` |
| Helper functions | `decodeImage(imgstring, fileName)`, `encodeImageIntoBase64(path)` in `signLanguage/utils/main_utils.py` |
| Max upload size | 5 MB |
| Live mode | One frame at a time, longest side 640 px, minimum 500 ms between sends |
| Colours | Fog `#EDF0F5`, Paper `#FFFFFF`, Deep Ink `#16213E`, Dusk `#5B6478`, Signal Cobalt `#2F3BFF`, Match Green `#0B7A55`, Alert Red `#B42318` |
| Fonts | Bricolage Grotesque (display), Atkinson Hyperlegible (body) |

## 4. Decisions

| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-20 | Start from a "sign recognition website" plan using Next.js, MediaPipe, and TensorFlow.js | First proposal |
| 2026-09-20 | **Switch to the owner's architecture diagram: Flask + YOLOv5 + Docker + GitHub Actions + AWS** | The first plan was too complex. The diagram is simpler and matches what the owner wants to build. |
| 2026-09-20 | Use `subprocess.run` with a fixed argument list instead of `os.system` | Safer, and fails loudly |
| 2026-09-20 | `/live` uses browser-captured frames posted to `/predict` | The server (EC2) has no camera, so `detect.py --source 0` cannot work there |
| 2026-09-20 | Interface identity is the "detection frame" (corner brackets and label tab), light theme, Bricolage Grotesque with Atkinson Hyperlegible | Avoids the generic dark detector look and prioritises legibility |
| 2026-09-20 | Language is ASL alphabet only for v1 | Most public datasets, and static signs work with a single image |

## 5. Owner preferences

- Wants simple, step-by-step plans and the smallest structure that works.
- Prefers the architecture in the provided diagram over larger alternatives.
- Wants complete, ready-to-use files.

## 6. Known issues and limitations

| # | Issue | Planned fix |
|---|-------|-------------|
| K-1 | Fixed `inputImage.jpg` and output folder mean concurrent users can collide | Unique request IDs (TASKS T-090) |
| K-2 | Running `detect.py` per request reloads the model, so it is slow | Load the model once (T-091) |
| K-3 | Only the annotated image is returned, so there is no text result for screen readers | `detections` field (implemented in app.py) |
| K-4 | Camera access needs HTTPS in production | Reverse proxy or load balancer with TLS (T-084) |
| K-5 | Images are sent to the server. This differs from an in-browser approach. | Privacy note on the page, images not retained |
| K-6 | ASL letters J and Z use motion, so a single frame cannot capture them | Best-effort only in v1. Note it on the page. Motion support is a backlog item |

## 6b. Model log

Add one row for every trained model.

| Date | Dataset and version | Epochs | Weights | mAP@0.5 | Weak letters | Notes |
|------|---------------------|--------|---------|---------|--------------|-------|
| none yet | | | | | | |

## 7. Open questions

1. Which dataset and licence?
2. EC2 instance size, and is it CPU-only?
3. Domain name and TLS approach?
4. Should weak letters be shown to users?

## 8. Glossary

| Term | Meaning |
|------|---------|
| ASL | American Sign Language |
| YOLOv5 | A fast object-detection model from Ultralytics |
| `best.pt` | The trained model weights file with the best validation score |
| mAP@0.5 | Mean average precision at an overlap threshold of 0.5. The main detection accuracy measure. |
| Confidence | The model's score (0 to 1) for a detection |
| Base64 | Text encoding of binary data, used to send images inside JSON |
| ECR | AWS Elastic Container Registry, where the Docker image is stored |
| EC2 | AWS virtual server that runs the container |
| Self-hosted runner | A GitHub Actions worker that runs on our own EC2 machine |
| Detection frame | The design motif: corner brackets and a label tab on the stage |

## 9. Session log

| Date | What happened | Files changed |
|------|---------------|---------------|
| 2026-09-20 | Planned the project, moved to Flask + YOLOv5 architecture, wrote PRD, Architecture, Rules, Design, Tasks, Memory | PRD.md, Architecture.md, Rules.md, Design.md, Tasks.md, Memory.md |
| 2026-09-20 | Implemented complete codebase: package utilities, Flask app, CSS/HTML/JS UI, test suite (9/9 passing), Colab notebook, Dockerfile, and GitHub Actions CI/CD | `app.py`, `signLanguage/utils/main_utils.py`, `templates/index.html`, `static/css/style.css`, `static/js/app.js`, `yolov5/detect.py`, `tests/test_*.py`, `notebooks/train_yolov5.ipynb`, `Dockerfile`, `.github/workflows/main.yaml`, `README.md` |

Add new entries at the bottom.
