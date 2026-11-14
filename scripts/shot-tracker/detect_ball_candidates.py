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


def candidates(
    frame: np.ndarray,
    output_width: int,
    previous_gray: np.ndarray | None,
    roi: tuple[float, float, float, float],
    motion_filter: bool = True,
    background_subtractor: cv2.BackgroundSubtractor | None = None,
) -> tuple[list[tuple], float, np.ndarray]:
    original_height, original_width = frame.shape[:2]
    scale = min(1.0, output_width / original_width)
    if scale < 1.0:
        frame = cv2.resize(
            frame,
            (round(original_width * scale), round(original_height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    x1 = round(frame.shape[1] * roi[0])
    y1 = round(frame.shape[0] * roi[1])
    x2 = round(frame.shape[1] * roi[2])
    y2 = round(frame.shape[0] * roi[3])
    crop = frame[y1:y2, x1:x2]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    ball_color = cv2.inRange(
        hsv,
        np.array([4, 105, 55], dtype=np.uint8),
        np.array([27, 255, 255], dtype=np.uint8),
    )
    # Outdoor lighting can make the same ball appear deep red rather than
    # orange, especially in the user's late-day footage.
    red_low = cv2.inRange(
        hsv,
        np.array([0, 60, 45], dtype=np.uint8),
        np.array([3, 255, 255], dtype=np.uint8),
    )
    red_high = cv2.inRange(
        hsv,
        np.array([165, 60, 45], dtype=np.uint8),
        np.array([179, 255, 255], dtype=np.uint8),
    )
    ball_color = cv2.bitwise_or(
        ball_color, cv2.bitwise_or(red_low, red_high)
    )
    if motion_filter and previous_gray is not None:
        motion = cv2.absdiff(gray, previous_gray)
        _, moving = cv2.threshold(motion, 18, 255, cv2.THRESH_BINARY)
        moving = cv2.dilate(moving, np.ones((3, 3), dtype=np.uint8), iterations=1)
        ball_color = cv2.bitwise_and(ball_color, moving[y1:y2, x1:x2])
    if background_subtractor is not None:
        foreground = background_subtractor.apply(frame, learningRate=0.002)
        foreground = cv2.threshold(foreground, 200, 255, cv2.THRESH_BINARY)[1]
        ball_color = cv2.bitwise_and(ball_color, foreground[y1:y2, x1:x2])
    ball_color = cv2.morphologyEx(
        ball_color, cv2.MORPH_OPEN, np.ones((3, 3), dtype=np.uint8)
    )

    found, _ = cv2.findContours(
        ball_color, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    results = []
    for contour in found:
        area = cv2.contourArea(contour)
        # A near-camera ball can still occupy thousands of pixels after
        # downscaling from 4K footage.
        if area < 12 or area > 10000:
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
        center_x = (moments["m10"] / moments["m00"] + x1) / scale
        center_y = (moments["m01"] / moments["m00"] + y1) / scale
        results.append(
            (
                round(center_x, 1),
                round(center_y, 1),
                round(area / (scale * scale), 1),
                round(circularity, 3),
            )
        )
    return results, scale, gray


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="CSV output path")
    parser.add_argument("--stride", type=int, default=1, help="Process every Nth frame")
    parser.add_argument("--width", type=int, default=960, help="Working frame width")
    parser.add_argument("--max-frames", type=int, default=0, help="Limit frames for a quick test")
    parser.add_argument(
        "--no-motion-filter",
        action="store_true",
        help="Keep color/shape candidates even when frame-to-frame motion is weak",
    )
    parser.add_argument(
        "--background-subtract",
        action="store_true",
        help="Mask the fixed-camera background to reduce stationary color false positives",
    )
    parser.add_argument(
        "--roi",
        default="0.34,0.06,0.66,0.42",
        help="Normalized x1,y1,x2,y2 region around the hoop and shot flight path",
    )
    args = parser.parse_args()
    roi = tuple(float(part) for part in args.roi.split(","))
    if len(roi) != 4 or not (0 <= roi[0] < roi[2] <= 1 and 0 <= roi[1] < roi[3] <= 1):
        raise SystemExit("--roi must be normalized x1,y1,x2,y2 bounds")

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise SystemExit(f"Could not open video: {args.video}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    frame_index = 0
    processed = 0
    detections = 0
    previous_gray = None
    background_subtractor = (
        cv2.createBackgroundSubtractorMOG2(history=300, varThreshold=32, detectShadows=False)
        if args.background_subtract else None
    )
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
            found, _, current_gray = candidates(
                frame,
                args.width,
                previous_gray,
                roi,
                motion_filter=not args.no_motion_filter,
                background_subtractor=background_subtractor,
            )
            previous_gray = current_gray
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
