"""Zero-cost orange-ball candidate extractor for fixed-camera shooting footage.

This deliberately does not classify makes or misses. It creates frame-level
candidate points so the ball detector can be inspected and tuned against real
clips before a trajectory classifier is added.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2
import numpy as np


def candidates(frame: np.ndarray, output_width: int) -> tuple[list[tuple], float]:
    original_height, original_width = frame.shape[:2]
    scale = min(1.0, output_width / original_width)
    if scale < 1.0:
        frame = cv2.resize(
            frame,
            (round(original_width * scale), round(original_height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    orange = cv2.inRange(
        hsv,
        np.array([4, 105, 55], dtype=np.uint8),
        np.array([27, 255, 255], dtype=np.uint8),
    )
    orange = cv2.morphologyEx(
        orange, cv2.MORPH_OPEN, np.ones((3, 3), dtype=np.uint8)
    )

    found, _ = cv2.findContours(
        orange, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    results = []
    for contour in found:
        area = cv2.contourArea(contour)
        if area < 12 or area > 1800:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        circularity = 4.0 * np.pi * area / (perimeter * perimeter)
        x, y, width, height = cv2.boundingRect(contour)
        aspect = width / max(height, 1)
        if circularity < 0.36 or not 0.55 <= aspect <= 1.8:
            continue
        moments = cv2.moments(contour)
        if moments["m00"] == 0:
            continue
        center_x = moments["m10"] / moments["m00"] / scale
        center_y = moments["m01"] / moments["m00"] / scale
        results.append(
            (
                round(center_x, 1),
                round(center_y, 1),
                round(area / (scale * scale), 1),
                round(circularity, 3),
            )
        )
    return results, scale


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="CSV output path")
    parser.add_argument("--stride", type=int, default=1, help="Process every Nth frame")
    parser.add_argument("--width", type=int, default=960, help="Working frame width")
    parser.add_argument("--max-frames", type=int, default=0, help="Limit frames for a quick test")
    args = parser.parse_args()

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise SystemExit(f"Could not open video: {args.video}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    frame_index = 0
    processed = 0
    detections = 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(["frame", "time_seconds", "x_pixels", "y_pixels", "area", "circularity"])
        while True:
            ok, frame = capture.read()
            if not ok or (args.max_frames and processed >= args.max_frames):
                break
            current_index = frame_index
            frame_index += 1
            if current_index % max(args.stride, 1):
                continue
            found, _ = candidates(frame, args.width)
            for x, y, area, circularity in found:
                writer.writerow(
                    [
                        current_index,
                        round(current_index / fps, 3),
                        x,
                        y,
                        area,
                        circularity,
                    ]
                )
                detections += 1
            processed += 1

    capture.release()
    print(
        f"Processed {processed} frames; found {detections} orange-ball candidates. "
        f"Results: {args.output}"
    )


if __name__ == "__main__":
    main()
