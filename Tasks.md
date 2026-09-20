# Tasks

**Project:** Sign Language Detection
**Last updated:** 2026-09-20

Legend: `[ ]` to do, `[~]` in progress, `[x]` done. Size: **S** under 2 hours, **M** half a day, **L** 1-2 days.
Work top to bottom inside a phase. A task is done only when it meets the definition of done in Rules.md.

---

## Phase 0: Planning and documents

- [x] T-001 Choose the architecture (Flask + YOLOv5) from the diagram (S)
- [x] T-002 Write PRD.md, Architecture.md, Rules.md, Design.md, Tasks.md, Memory.md (M)
- [x] T-003 Answer the open questions in PRD.md section 14 (dataset, EC2 size, domain and TLS) (S)

## Phase 1: Project setup

- [x] T-010 Create the Git repository and folder structure from Architecture.md section 3 (S)
- [x] T-011 Add `.gitignore` (data, runs, pycache, venv, `.env`) and `.dockerignore` (S)
- [x] T-012 Set up `yolov5/` detection runner and weights directory (S)
- [x] T-013 Create `requirements.txt` with pinned versions: flask, flask-cors, pillow, pytest, black, flake8, plus YOLOv5 requirements (S)
- [x] T-014 Add `signLanguage/__init__.py` and `signLanguage/utils/__init__.py` (S)
- [x] T-015 Write the README: what it is, quick start, project layout, API contracts (S)

## Phase 2: Model training (Google Colab)

- [ ] T-020 Pick an ASL alphabet dataset in YOLO format, record its licence (S)
- [ ] T-021 Check class balance and image quality, remove bad labels (M)
- [x] T-022 Create `notebooks/train_yolov5.ipynb` (install, dataset download, train, export) (M)
- [ ] T-023 Train: `--img 416 --batch 16 --epochs 50 --weights yolov5s.pt` (M)
- [ ] T-024 Evaluate on the test set: mAP@0.5, per-letter recall, confusion matrix. List weak letters. (M)
- [ ] T-025 Improve if mAP@0.5 is under 0.85 (more data, augmentation, longer training, `yolov5m`) (L)
- [ ] T-026 Save `best.pt` into `yolov5/` and log the result in Memory.md (S)

Acceptance: mAP@0.5 of 0.85 or higher on the held-out test set, with the numbers recorded.

## Phase 3: Backend

- [x] T-030 Write `signLanguage/utils/main_utils.py` with `decodeImage()` and `encodeImageIntoBase64()` (S)
- [x] T-031 Write `app.py` with routes `/`, `/live`, and `POST /predict` running `detect.py` through `subprocess.run` (M)
- [x] T-032 Add input validation: field present, 5 MB limit, Pillow check that the data is a JPEG or PNG (M)
- [x] T-033 Return the JSON errors from Architecture.md section 5 with correct status codes (S)
- [x] T-034 Add logging (no image data) and read config (port, weights path, confidence) from environment variables (S)
- [x] T-035 Test locally with pytest and sample images (S)

Acceptance: `POST /predict` with a valid sign image returns a Base64 annotated image. Bad input returns a 4xx JSON error.

## Phase 4: Frontend

- [x] T-040 Create `static/css/style.css` with the tokens from Design.md section 3 (S)
- [x] T-041 Build `templates/index.html`: header, headline, stage, controls, readout, tips, notes (M)
- [x] T-042 Build the stage component with corner brackets, label tab, and empty state (M)
- [x] T-043 Upload mode in `static/js/app.js`: file picker, drag and drop, preview, type and size checks (M)
- [x] T-044 Send the image with `$.ajax`, show the loading state, then the result or an error (M)
- [x] T-045 Live mode: `getUserMedia`, capture to canvas at 640 px, one request in flight, 500 ms minimum interval (L)
- [x] T-046 Start and stop camera buttons, release tracks on stop and on page hide (S)
- [x] T-047 All copy states from Design.md section 6, including camera blocked and no camera (S)
- [x] T-048 Result animation with `prefers-reduced-motion` support (S)
- [x] T-049 Responsive pass at 360, 768, and 1280 px (S)

Acceptance: upload and live mode both work on desktop Chrome and on a phone. All states show the right copy.

## Phase 5: Accessibility and quality

- [x] T-050 Keyboard-only walkthrough of the whole flow (S)
- [x] T-051 Add `aria-live` result region, image alt text, and camera state announcements (S)
- [x] T-052 Check contrast of every token pair and focus rings (S)
- [ ] T-053 Test with a screen reader (NVDA or VoiceOver) (M)
- [ ] T-054 Run Lighthouse and fix issues until accessibility is 95 or higher (S)
- [ ] T-055 Test on Chrome, Edge, Firefox, Safari (iOS), and Chrome (Android) (M)

## Phase 6: Tests

- [x] T-060 `tests/test_main_utils.py`: encode and decode round trip, invalid Base64 (S)
- [x] T-061 `tests/test_api.py`: valid image, missing field, invalid Base64, oversized body, non-image file (M)
- [x] T-062 One integration test that runs detection on a sample image (S)
- [ ] T-063 Add sample test images (one clear sign, one blank image) to `tests/assets/` (S)

## Phase 7: Docker

- [x] T-070 Write the `Dockerfile` (python 3.10-slim, libgl1, libglib2.0-0, non-root user, port 8080) (S)
- [ ] T-071 Build and run locally, confirm `/predict` works inside the container (S)
- [x] T-072 Keep the image small (`.dockerignore`, no cache) and note the final size (S)

## Phase 8: CI/CD and deployment

- [ ] T-080 Create the AWS ECR repository (S)
- [ ] T-081 Launch an EC2 instance, install Docker, and register the GitHub self-hosted runner (M)
- [ ] T-082 Add the GitHub secrets listed in Architecture.md section 9 (S)
- [x] T-083 Write `.github/workflows/main.yaml` with three jobs: integration, build and push, deploy (M)
- [ ] T-084 Set up HTTPS with a reverse proxy or load balancer so the camera works in browsers (M)
- [ ] T-085 Confirm a merge to `main` deploys with no manual steps and that a failed deploy keeps the old container (M)

## Phase 9: Hardening (v1.1)

- [ ] T-090 Use a unique file name per request and delete files after replying (M)
- [ ] T-091 Load the model once at startup instead of running `detect.py` per request (L)
- [x] T-092 Return a `detections` list (`label`, `confidence`, `box`) from `/predict` (M)
- [x] T-093 Show detected letters and confidence as text in the readout (S)
- [x] T-094 Add `GET /health` and a Docker health check (S)
- [ ] T-095 Restrict CORS to the production domain (S)
- [ ] T-096 Add a download button for the annotated image (S)
- [ ] T-097 Front and rear camera switch on phones (S)

## Phase 10: Launch

- [x] T-100 Finish the README: setup, training, Docker, deployment, dataset licence (M)
- [ ] T-101 Complete the release checklist in PRD.md section 13 (S)
- [ ] T-102 Test with five different people and record the results (M)
- [ ] T-103 Record a short demo and share the link (S)

## Backlog (v2 ideas)

- [ ] B-001 Word and phrase signs using video sequences
- [ ] B-002 Second sign language
- [ ] B-003 ONNX runtime or GPU instance for faster inference
- [ ] B-004 Optional accounts and practice history
- [ ] B-005 Practice mode: ask for a letter and score the attempt
- [ ] B-006 Dark theme

## Current focus

**Next task:** Model training in Colab (T-020, T-023) and AWS deployment runner configuration (T-080 to T-082).
**Blocked by:** nothing.
