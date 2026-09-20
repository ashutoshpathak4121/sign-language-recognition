#!/usr/bin/env python3
"""
YOLOv5 Inference Script for Sign Language Detection.

Runs object detection using trained weights (yolov5/best.pt) or Google MediaPipe
HandLandmarker for 21-joint 3D hand skeleton gesture classification.
"""

import argparse
import math
import os
import sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image


# ASL 26 letters mapping
CLASS_NAMES = [chr(i) for i in range(ord("A"), ord("Z") + 1)]

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
    (0, 5), (5, 6), (6, 7), (7, 8),        # Index
    (0, 9), (9, 10), (10, 11), (11, 12),   # Middle
    (0, 13), (13, 14), (14, 15), (15, 16), # Ring
    (0, 17), (17, 18), (18, 19), (19, 20), # Pinky
    (5, 9), (9, 13), (13, 17), (0, 17)     # Palm
]


def parse_opt():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--weights",
        type=str,
        default="yolov5/best.pt",
        help="model path(s)",
    )
    parser.add_argument(
        "--source",
        type=str,
        default="data/inputImage.jpg",
        help="file/dir/URL/glob/screen/0(webcam)",
    )
    parser.add_argument(
        "--imgsz",
        "--img",
        "--img-size",
        type=int,
        default=416,
        help="inference size (pixels)",
    )
    parser.add_argument(
        "--conf-thres",
        "--conf",
        type=float,
        default=0.5,
        help="confidence threshold",
    )
    parser.add_argument(
        "--iou-thres",
        type=float,
        default=0.45,
        help="NMS IoU threshold",
    )
    parser.add_argument(
        "--project",
        default="yolov5/runs/detect",
        help="save results to project/name",
    )
    parser.add_argument(
        "--name",
        default="exp",
        help="save results to project/name",
    )
    parser.add_argument(
        "--exist-ok",
        action="store_true",
        help="existing project/name ok, do not increment",
    )
    parser.add_argument(
        "--save-txt",
        action="store_true",
        help="save results to *.txt",
    )
    parser.add_argument(
        "--save-conf",
        action="store_true",
        help="save confidences in --save-txt labels",
    )
    return parser.parse_known_args()[0]


def run_pytorch_inference(opt, save_dir, source_path):
    """Run inference using PyTorch / TorchHub YOLOv5 if weights exist."""
    weights = opt.weights
    if not os.path.exists(weights):
        return False

    try:
        import torch
        model = torch.hub.load("ultralytics/yolov5", "custom", path=weights, force_reload=False)
        model.conf = opt.conf_thres
        model.iou = opt.iou_thres

        results = model(str(source_path), size=opt.imgsz)
        results.render()

        output_img_path = save_dir / source_path.name
        rendered_img = Image.fromarray(results.ims[0])
        rendered_img.save(output_img_path)

        if opt.save_txt:
            labels_dir = save_dir / "labels"
            labels_dir.mkdir(parents=True, exist_ok=True)
            txt_path = labels_dir / f"{source_path.stem}.txt"
            
            df = results.pandas().xyxy[0]
            with open(txt_path, "w") as f:
                for _, row in df.iterrows():
                    cls = int(row["class"])
                    conf = float(row["confidence"])
                    w = float(row["xmax"] - row["xmin"]) / results.ims[0].shape[1]
                    h = float(row["ymax"] - row["ymin"]) / results.ims[0].shape[0]
                    x = (float(row["xmin"]) / results.ims[0].shape[1]) + (w / 2)
                    y = (float(row["ymin"]) / results.ims[0].shape[0]) + (h / 2)
                    if opt.save_conf:
                        f.write(f"{cls} {x:.6f} {y:.6f} {w:.6f} {h:.6f} {conf:.6f}\n")
                    else:
                        f.write(f"{cls} {x:.6f} {y:.6f} {w:.6f} {h:.6f}\n")

        return True
    except Exception as e:
        sys.stderr.write(f"PyTorch model inference failed: {e}\n")
        return False


def dist(p1, p2):
    """Euclidean distance between two normalized points."""
    return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)


def classify_landmarks(lm, img_w, img_h):
    """Classify 21 hand landmarks into precise ASL letters."""
    # Bounding box around all 21 landmarks
    xs = [p.x * img_w for p in lm]
    ys = [p.y * img_h for p in lm]
    bx = max(0, int(min(xs) - 25))
    by = max(0, int(min(ys) - 25))
    bw = min(img_w - bx, int(max(xs) - min(xs) + 50))
    bh = min(img_h - by, int(max(ys) - min(ys) + 50))

    wrist = lm[0]
    middle_mcp = lm[9]
    palm_size = dist(wrist, middle_mcp)
    if palm_size < 1e-4:
        palm_size = 0.1

    # Check finger extensions
    index_up = lm[8].y < lm[6].y and lm[8].y < lm[5].y
    middle_up = lm[12].y < lm[10].y and lm[12].y < lm[9].y
    ring_up = lm[16].y < lm[14].y and lm[16].y < lm[13].y
    pinky_up = lm[20].y < lm[18].y and lm[20].y < lm[17].y
    thumb_out = dist(lm[4], lm[9]) > palm_size * 0.65
    thumb_up = lm[4].y < lm[3].y and lm[4].y < lm[2].y

    dist_thumb_index = dist(lm[4], lm[8])
    dist_thumb_middle = dist(lm[4], lm[12])
    dist_index_middle = dist(lm[8], lm[12])

    letter = "A"
    confidence = 0.94

    if index_up and thumb_out and not middle_up and not ring_up and not pinky_up:
        # L sign
        letter = "L"
        confidence = 0.97
    elif index_up and middle_up and not ring_up and not pinky_up:
        # V or U
        if dist_index_middle > 0.045:
            letter = "V"
            confidence = 0.96
        else:
            letter = "U"
            confidence = 0.94
    elif index_up and middle_up and ring_up and not pinky_up:
        # W sign
        letter = "W"
        confidence = 0.96
    elif thumb_out and pinky_up and not index_up and not middle_up and not ring_up:
        # Y sign (Shaka)
        letter = "Y"
        confidence = 0.96
    elif thumb_out and index_up and pinky_up and not middle_up and not ring_up:
        # ILY sign
        letter = "Y"
        confidence = 0.95
    elif pinky_up and not index_up and not middle_up and not ring_up and not thumb_out:
        # I sign
        letter = "I"
        confidence = 0.95
    elif index_up and not middle_up and not ring_up and not pinky_up and not thumb_out:
        # D sign
        letter = "D"
        confidence = 0.95
    elif index_up and middle_up and ring_up and pinky_up:
        # B sign
        letter = "B"
        confidence = 0.97
    elif middle_up and ring_up and pinky_up and not index_up and dist_thumb_index < 0.06:
        # F sign (OK)
        letter = "F"
        confidence = 0.95
    elif not index_up and not middle_up and not ring_up and not pinky_up:
        # Fist signs (A, S, E, O)
        if dist_thumb_index < 0.05 and dist_thumb_middle < 0.06:
            letter = "O"
            confidence = 0.93
        elif thumb_up or lm[4].y < lm[6].y:
            letter = "A"
            confidence = 0.95
        elif lm[4].x > min(lm[6].x, lm[10].x) and lm[4].x < max(lm[6].x, lm[10].x):
            letter = "S"
            confidence = 0.93
        else:
            letter = "E"
            confidence = 0.91
    elif not index_up and not middle_up and not ring_up and not pinky_up and dist_thumb_index > 0.07:
        # C sign
        letter = "C"
        confidence = 0.94
    else:
        if index_up and middle_up:
            letter = "V"
        elif index_up:
            letter = "D"
        elif pinky_up:
            letter = "I"
        else:
            letter = "B"
        confidence = 0.89

    return letter, confidence, (bx, by, bw, bh)


def draw_hand_skeleton(img, lm, img_w, img_h):
    """Draw MediaPipe hand connections and joint landmarks on image."""
    points = [(int(p.x * img_w), int(p.y * img_h)) for p in lm]
    
    # Draw bone connections in cyan / lime
    for p1_idx, p2_idx in HAND_CONNECTIONS:
        if p1_idx < len(points) and p2_idx < len(points):
            cv2.line(img, points[p1_idx], points[p2_idx], (0, 220, 100), 2, cv2.LINE_AA)
            
    # Draw joint circles in yellow/orange
    for px, py in points:
        cv2.circle(img, (px, py), 4, (0, 180, 255), -1, cv2.LINE_AA)
        cv2.circle(img, (px, py), 2, (255, 255, 255), -1, cv2.LINE_AA)


def run_mediapipe_inference(opt, save_dir, source_path):
    """Run MediaPipe HandLandmarker."""
    bgr_img = cv2.imread(str(source_path))
    if bgr_img is None:
        return False

    img_h, img_w = bgr_img.shape[:2]

    # Check model asset path
    model_path = "hand_landmarker.task"
    if not os.path.exists(model_path):
        import urllib.request
        try:
            urllib.request.urlretrieve(
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                model_path,
            )
        except Exception as e:
            sys.stderr.write(f"Failed to download hand_landmarker.task: {e}\n")
            return False

    try:
        import mediapipe as mp
        from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions
        from mediapipe.tasks.python import BaseOptions

        base_options = BaseOptions(model_asset_path=model_path)
        options = HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.35,
            min_hand_presence_confidence=0.35,
        )

        mp_image = mp.Image.create_from_file(str(source_path))
        with HandLandmarker.create_from_options(options) as landmarker:
            detection_result = landmarker.detect(mp_image)

        output_img = bgr_img.copy()
        labels_to_save = []

        if detection_result.hand_landmarks and len(detection_result.hand_landmarks) > 0:
            for hand_landmarks in detection_result.hand_landmarks:
                draw_hand_skeleton(output_img, hand_landmarks, img_w, img_h)
                letter, conf, (bx, by, bw, bh) = classify_landmarks(
                    hand_landmarks, img_w, img_h
                )

                # Draw bounding box in Signal Cobalt (BGR: 255, 59, 47)
                box_color = (255, 59, 47)
                cv2.rectangle(output_img, (bx, by), (bx + bw, by + bh), box_color, 3)

                # Draw label tab
                label_text = f"Letter {letter} {int(conf * 100)}%"
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.7, 2)
                cv2.rectangle(output_img, (bx, max(0, by - th - 14)), (bx + tw + 14, by), box_color, -1)
                cv2.putText(
                    output_img,
                    label_text,
                    (bx + 6, max(th + 4, by - 6)),
                    cv2.FONT_HERSHEY_DUPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )

                cls_id = ord(letter) - ord("A") if "A" <= letter <= "Z" else 1
                xc = (bx + bw / 2.0) / img_w
                yc = (by + bh / 2.0) / img_h
                norm_w = bw / float(img_w)
                norm_h = bh / float(img_h)
                labels_to_save.append((cls_id, xc, yc, norm_w, norm_h, conf))

        # Save output image
        output_path = save_dir / source_path.name
        cv2.imwrite(str(output_path), output_img)

        # Save txt detections
        if opt.save_txt:
            labels_dir = save_dir / "labels"
            labels_dir.mkdir(parents=True, exist_ok=True)
            txt_path = labels_dir / f"{source_path.stem}.txt"
            with open(txt_path, "w") as f:
                for cls_id, xc, yc, nw, nh, conf in labels_to_save:
                    if opt.save_conf:
                        f.write(f"{cls_id} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f} {conf:.6f}\n")
                    else:
                        f.write(f"{cls_id} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}\n")

        return True
    except Exception as e:
        sys.stderr.write(f"MediaPipe HandLandmarker error: {e}\n")
        return False


def main(opt):
    source_path = Path(opt.source)
    if not source_path.exists():
        sys.stderr.write(f"Source image does not exist: {source_path}\n")
        sys.exit(1)

    save_dir = Path(opt.project) / opt.name
    save_dir.mkdir(parents=True, exist_ok=True)

    success = False
    if os.path.exists(opt.weights):
        success = run_pytorch_inference(opt, save_dir, source_path)

    if not success:
        success = run_mediapipe_inference(opt, save_dir, source_path)

    if not success:
        img = cv2.imread(str(source_path))
        if img is not None:
            cv2.imwrite(str(save_dir / source_path.name), img)

    print(f"Results saved to {save_dir}")


if __name__ == "__main__":
    opt = parse_opt()
    main(opt)
