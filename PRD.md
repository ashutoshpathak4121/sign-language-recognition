# Product Requirements Document (PRD)

**Project:** Sign Language Detection
**Version:** 1.0
**Status:** Draft
**Last updated:** 2026-09-20

---

## 1. Overview

Sign Language Detection is a website where a person uploads a photo or turns on their webcam, and a trained YOLOv5 model finds the hand sign in the image. The site shows the same image back with a box around the hand, the detected letter, and a confidence score.

The first release covers the **ASL fingerspelling alphabet (A-Z)**. It is a learning and demo tool. It does not replace a human interpreter.

## 2. Problem

- People learning sign language have no quick way to check whether a handshape is correct when they practise alone.
- Most existing tools need an app install, an account, or a paid plan.
- Developers and students who want to see an object-detection model working end to end have few small, complete, deployable examples.

## 3. Goals

| ID | Goal |
|----|------|
| G1 | Detect ASL alphabet signs from an uploaded image with clear visual feedback. |
| G2 | Detect signs from a live webcam feed in the browser. |
| G3 | Work with no login and no install, on desktop and mobile browsers. |
| G4 | Be fully deployable: Docker image, CI/CD, running on AWS EC2. |
| G5 | Be accessible to people with low vision, motor difficulties, and screen readers. |

## 4. Non-goals (v1)

- Recognising full words, phrases, or grammar (dynamic signs that need motion).
- Sign languages other than ASL.
- User accounts, saved history, or a database.
- Translating detected signs into speech or other languages.
- Native mobile apps.
- Real-time video at 30 FPS. Live mode is near-real-time (a few frames per second).

## 5. Users

| User | Need | How they use the product |
|------|------|--------------------------|
| Sign language learner | Check if their handshape matches the intended letter | Holds a sign to the webcam or uploads a photo, reads the result |
| Teacher or parent | Show a class or child how detection works | Uses live mode on a shared screen |
| Developer or reviewer | See a complete ML web project | Reads the repo, runs Docker, checks the API |

## 6. User stories

1. As a learner, I upload a photo of my hand so that I can see which letter the model thinks it is.
2. As a learner, I start my webcam so that I can try signs one after another without uploading each time.
3. As a learner, I see a confidence score so that I know how sure the model is.
4. As a user, I get a clear message when no sign is found so that I know what to change (lighting, distance, background).
5. As a user with a screen reader, I hear the detected letter and confidence announced so that I do not depend on the image alone.
6. As a user on a phone, I can use the rear or front camera and the page fits my screen.
7. As a developer, I can call `POST /predict` directly so that I can test the model without the UI.

## 7. Functional requirements

Priority uses MoSCoW: **M** must, **S** should, **C** could.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Home page (`/`) serves the app and explains what it does in one sentence. | M |
| FR-2 | User can choose an image file (JPG or PNG, up to 5 MB) or drag and drop it. | M |
| FR-3 | User can preview the chosen image before sending it. | M |
| FR-4 | "Detect signs" sends the image as Base64 JSON to `POST /predict`. | M |
| FR-5 | Server runs YOLOv5 (`best.pt`, 416x416, confidence 0.5) and returns the annotated image as Base64. | M |
| FR-6 | Browser shows the annotated image with boxes and labels. | M |
| FR-7 | Live page (`/live`) opens the user's camera with `getUserMedia`, sends one frame at a time to `/predict`, and shows each result. | M |
| FR-8 | Live mode never has more than one request in flight. It waits for a response before sending the next frame. | M |
| FR-9 | User can start and stop the camera. Stopping releases the camera. | M |
| FR-10 | Show a loading state while waiting and a clear error state if the request fails. | M |
| FR-11 | Show the detected letters and confidence as text next to the image (needs the `detections` field, see Architecture.md). | S |
| FR-12 | Screen-reader announcement (`aria-live`) for each new result. | S |
| FR-13 | Switch between front and rear camera on phones. | S |
| FR-14 | Download the annotated image. | C |
| FR-15 | Health endpoint `GET /health` for deployment checks. | S |

## 8. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | `/predict` p95 under 3 s on the target EC2 instance for one 416 px image (v1). Under 1 s after the model is preloaded (v1.1). Targets to be validated. |
| Accuracy | mAP@0.5 of at least 0.85 on the held-out test set. Per-letter recall reported. Look-alike pairs (M/N, U/V, R/U) documented. |
| Availability | Single instance is acceptable for v1. Container restarts automatically on failure. |
| Security | Request size limit, image validation, restricted CORS in production, no debug mode, no secrets in the repo. |
| Privacy | Images are used only to run detection. They are overwritten on the next request and never logged or shared. The page must say that images are sent to the server. |
| Accessibility | WCAG 2.1 AA: keyboard operable, visible focus, 4.5:1 text contrast, labelled controls, reduced-motion respected. |
| Compatibility | Latest Chrome, Edge, Firefox, Safari, plus Chrome on Android and Safari on iOS. |
| Maintainability | Small codebase, documented rules (Rules.md), CI on every push. |

## 9. Scope by release

**v1.0 (MVP)**
- Upload and detect (FR-1 to FR-6, FR-10)
- Live camera mode (FR-7 to FR-9)
- Docker image and CI/CD to EC2

**v1.1**
- Detections list in the API and UI (FR-11), screen-reader announcements (FR-12)
- Model preloaded once at server start
- Unique file names per request (safe for multiple users)
- Health endpoint, download button

**v2**
- Word and phrase signs, a second sign language
- Optional accounts and practice history
- Faster inference (ONNX or GPU)

## 10. Success metrics

| Metric | Target |
|--------|--------|
| Test-set mAP@0.5 | 0.85 or higher |
| Correct top result on 26 letters, tested by 5 different people | 80% or higher |
| Time from clicking "Detect signs" to seeing the result | Under 3 s |
| Lighthouse accessibility score | 95 or higher |
| Deploy from merge to running container | Under 10 minutes, no manual steps |

## 11. Assumptions and constraints

- A labelled ASL alphabet dataset in YOLO format is available (for example from Roboflow) and its licence allows this use.
- Training happens in Google Colab on a free GPU. The server runs on CPU.
- The stack is fixed by the architecture diagram: Flask, YOLOv5, HTML/CSS/Bootstrap, jQuery/AJAX, Docker, GitHub Actions, AWS ECR and EC2.
- Browsers only allow camera access over HTTPS (or `localhost`), so production needs TLS.

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Model works well on the dataset but poorly on new people, lighting, or backgrounds | Low real-world accuracy | Collect extra photos from varied people, augment data, report per-condition results |
| J and Z cannot be detected reliably. In ASL they are drawn in the air, and one image shows no motion | These two letters may be missed or read as another letter | Treat J and Z as best-effort. Say so in the supported-signs section. Full motion support needs a video model (backlog) |
| Look-alike letters confused | Wrong feedback for learners | Show confidence, document known confusions on the About section |
| Two users at once overwrite the same `inputImage.jpg` | Wrong image returned | Unique file names per request (v1.1) |
| CPU inference is slow through a subprocess | Live mode feels laggy | Preload the model, lower frame rate, resize frames in the browser |
| Camera blocked on plain HTTP | Live mode does not work in production | Put the app behind HTTPS |
| Users treat results as authoritative | Misleading | State clearly that it is a learning tool |

## 13. Release acceptance criteria

- [ ] All **M** requirements pass manual testing on Chrome (desktop), Safari (iOS), and Chrome (Android).
- [ ] `docker run -p 8080:8080` starts the app and `/predict` returns an annotated image.
- [ ] CI passes (lint and tests) and the pipeline deploys to EC2 without manual steps.
- [ ] Accessibility checklist in Design.md is complete.
- [ ] README explains setup, training, and deployment.

## 14. Open questions

1. Which dataset and licence will be used for training?
2. Is the EC2 instance CPU-only, and which size?
3. Which domain and TLS approach (ALB, Nginx, Caddy, CloudFront)?
4. Should the model's known weak letters be shown to users in the interface?
