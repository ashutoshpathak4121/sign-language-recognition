# 🤟 Real-Time Sign Language Recognition & Detection

An end-to-end Machine Learning web application that detects and recognizes American Sign Language (ASL) fingerspelling in real-time from webcam feed or uploaded images using custom YOLOv5 and MediaPipe.

---

## ✨ Features

- **Live Webcam Detection**: Real-time sign language recognition with low latency.
- **Image Upload Support**: Upload any photo to detect and highlight hand signs with bounding boxes and confidence scores.
- **Modern UI / UX**: Clean, accessible, responsive interface.
- **Dockerized & Cloud Ready**: Fully containerized for easy deployment across environments (AWS EC2 / Docker).
- **CI/CD Automation**: GitHub Actions workflow included for automated testing and deployment.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask
- **Computer Vision & ML**: YOLOv5, PyTorch, MediaPipe, OpenCV
- **Frontend**: HTML5, Vanilla CSS3, Modern JavaScript (Fetch API, MediaDevices)
- **Deployment & CI/CD**: Docker, GitHub Actions, AWS EC2

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
cd "Sign language recogination"
```

### 2. Set Up Virtual Environment
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to `http://localhost:8080`.

---

## 🐳 Running with Docker

```bash
# Build the Docker image
docker build -t sign-language-detection .

# Run the container
docker run -p 8080:8080 sign-language-detection
```

---

## 📁 Project Structure

```
├── .github/workflows/     # CI/CD pipelines
├── data/                  # Data artifacts and test images
├── notebooks/             # Research & exploration notebooks
├── signLanguage/          # Core detection & pipeline modules
├── static/                # CSS, JS, and UI assets
├── templates/             # HTML templates (Flask)
├── tests/                 # Unit and integration tests
├── yolov5/                # YOLOv5 architecture and weights
├── app.py                 # Flask server entry point
├── Dockerfile             # Container definition
├── requirements.txt       # Project dependencies
└── README.md              # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License.
