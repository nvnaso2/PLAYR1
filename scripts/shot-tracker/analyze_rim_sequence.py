"""Find shot moments by watching ball detections enter the rim area."""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, field

import cv2
import numpy as np

WORK_WIDTH = 360


@dataclass
class Track:
    points: list[tuple[float, float, float]] = field(default_factory=list)


def detect_rim(frame: np.ndarray) -> tuple[float, float, float] | None:
    height, width = frame.shape[:2]
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    red = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 51, 38], np.uint8), np.array([12, 255, 255], np.uint8)),
        cv2.inRange(hsv, np.array([172, 51, 38], np.uint8), np.array([179, 255, 255], np.uint8)),
    )
    count, _, stats, centers = cv2.connectedComponentsWithStats(red, 8)
    options: list[tuple[float, float, float, float]] = []
    for index in range(1, count):
        x, y, box_width, box_height, area = stats[index]
        center_x, center_y = centers[index]
        aspect = box_width / max(box_height, 1)
        if (
            area < 12 or area > 1200 or box_width < 8 or box_height < 3
            or not 1.3 <= aspect <= 5.5 or box_width > width * 0.25
            or box_height > height * 0.06 or not height * 0.12 <= center_y <= height * 0.7
        ):
            continue
        aspect_score = max(0.2, 1 - abs(aspect - 2.2) / 4)
        center_score = max(0.5, 1 - abs(center_x / width - 0.5))
        height_score = max(0.25, 1 - 4.5 * abs(center_y / height - 0.38))
        score = area ** 0.15 * aspect_score * center_score**2 * height_score
        options.append((score, float(center_x), float(center_y), float(box_width)))
    if not options:
        return None
    _, center_x, center_y, box_width = max(options)
    return center_x, center_y, max(4.0, box_width * 0.35)


def ball_candidates(
    frame: np.ndarray,
    previous_gray: np.ndarray | None,
    hoop: tuple[float, float, float],
) -> tuple[list[tuple[float, float]], np.ndarray]:
    height, width = frame.shape[:2]
    rim_x, rim_y, half_width = hoop
    radius_x = max(40, int(half_width * 5))
    top = max(0, int(rim_y - max(50, half_width * 5)))
    bottom = min(height, int(rim_y + max(72, half_width * 7)))
    left = max(0, int(rim_x - radius_x))
    right = min(width, int(rim_x + radius_x))
    crop = frame[top:bottom, left:right]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(
        hsv, np.array([0, 82, 42], np.uint8), np.array([34, 255, 255], np.uint8)
    )
    if previous_gray is not None:
        motion = cv2.absdiff(gray, previous_gray)
        moving = cv2.dilate(cv2.threshold(motion, 14, 255, cv2.THRESH_BINARY)[1], np.ones((3, 3), np.uint8))
        mask = cv2.bitwise_and(mask, moving)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[tuple[float, float]] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not 5 <= area <= 260:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        circularity = 4 * math.pi * area / (perimeter * perimeter)
        x, y, box_width, box_height = cv2.boundingRect(contour)
        aspect = box_width / max(box_height, 1)
        if circularity < 0.32 or not 0.6 <= aspect <= 1.7:
            continue
        if box_width < 2 or box_height < 2 or box_width > 20 or box_height > 20:
            continue
        moments = cv2.moments(contour)
        if moments["m00"] == 0:
            continue
        candidates.append((
            float(left + moments["m10"] / moments["m00"]),
            float(top + moments["m01"] / moments["m00"]),
        ))
    return candidates, gray


def link_candidates(
    samples: list[tuple[float, list[tuple[float, float]]]],
) -> list[Track]:
    active: list[Track] = []
    completed: list[Track] = []
    for time_seconds, candidates in samples:
        still_active = []
        for track in active:
            if time_seconds - track.points[-1][0] > 0.65:
                completed.append(track)
            else:
                still_active.append(track)
        active = still_active
        pairs = []
        for track in active:
            last_time, last_x, last_y = track.points[-1]
            dt = max(time_seconds - last_time, 0.01)
            if len(track.points) >= 2 and dt <= 0.25:
                prev_time, prev_x, prev_y = track.points[-2]
                old_dt = max(last_time - prev_time, 0.01)
                predicted_x = last_x + (last_x - prev_x) / old_dt * dt
                predicted_y = last_y + (last_y - prev_y) / old_dt * dt
            else:
                predicted_x, predicted_y = last_x, last_y
            for index, (x, y) in enumerate(candidates):
                distance = math.hypot(x - predicted_x, y - predicted_y)
                if distance <= 420 * dt + 18:
                    pairs.append((distance, track, index))
        used_tracks: set[int] = set()
        used_candidates: set[int] = set()
        for _, track, index in sorted(pairs, key=lambda item: item[0]):
            if id(track) in used_tracks or index in used_candidates:
                continue
            x, y = candidates[index]
            track.points.append((time_seconds, x, y))
            used_tracks.add(id(track))
            used_candidates.add(index)
        for index, (x, y) in enumerate(candidates):
            if index not in used_candidates:
                active.append(Track([(time_seconds, x, y)]))
    return completed + active


def classify_tracks(
    tracks: list[Track],
    hoop: tuple[float, float, float],
) -> list[dict[str, float | str]]:
    rim_x, rim_y, half_width = hoop
    events = []
    for track in tracks:
        points = track.points
        if len(points) < 3:
            continue
        approach = None
        rim_point = None
        for index, point in enumerate(points):
            if abs(point[1] - rim_x) > half_width * 5:
                continue
            if point[2] >= rim_y - max(5, half_width * 0.6):
                for earlier in reversed(points[:index]):
                    elapsed = point[0] - earlier[0]
                    descended = point[2] - earlier[2]
                    if elapsed > 0.9:
                        break
                    if (
                        elapsed >= 0.08 and descended >= max(9, half_width * 1.1)
                        and earlier[2] <= rim_y - half_width * 0.6
                        and abs(earlier[1] - rim_x) <= half_width * 5
                    ):
                        approach = earlier
                        rim_point = point
                        break
                if rim_point is not None:
                    break
        if approach is None or rim_point is None:
            continue
        crossing = next(
            (
                point for point in points
                if point[0] >= rim_point[0]
                if point[2] >= rim_y and abs(point[1] - rim_x) <= half_width * 5
            ),
            None,
        )
        result = "uncertain"
        if crossing and abs(crossing[1] - rim_x) > half_width * 3:
            result = "possible_miss"
        elif crossing:
            after_crossing = [
                point for point in points
                if crossing[0] < point[0] <= crossing[0] + 1.0
            ]
            deepest = max(after_crossing, key=lambda point: point[2], default=None)
            rebound = bool(deepest and any(
                deepest[0] < point[0] <= crossing[0] + 1.0
                and deepest[2] - point[2] >= max(15, half_width * 2)
                for point in after_crossing
            ))
            below_points = [
                point for point in after_crossing
                if point[2] >= rim_y + max(16, half_width * 3)
                and abs(point[1] - rim_x) <= half_width * 1.7
            ]
            below = any(
                second[0] - first[0] >= 0.08
                for first, second in zip(below_points, below_points[1:])
            )
            if rebound:
                result = "possible_miss"
            elif below:
                result = "possible_make"
        events.append({
            "startSeconds": max(0.0, approach[0] - 0.2),
            "endSeconds": rim_point[0] + 0.3,
            "result": result,
            "reason": (
                "The ball appears to continue below the rim."
                if result == "possible_make"
                else "The ball appears to pass outside the rim."
                if crossing and abs(crossing[1] - rim_x) > half_width * 3
                else "The ball appears to rebound upward near the rim."
                if result == "possible_miss"
                else "The ball approaches the rim, but the result is not clear enough to count."
            ),
        })
    events.sort(key=lambda event: float(event["startSeconds"]))
    deduped = []
    for event in events:
        if deduped and float(event["startSeconds"]) - float(deduped[-1]["endSeconds"]) < 1.0:
            if float(event["endSeconds"]) > float(deduped[-1]["endSeconds"]):
                deduped[-1]["endSeconds"] = event["endSeconds"]
            continue
        deduped.append(event)
    return deduped


def analyze_video(
    video_path: str,
    manual_hoop: tuple[float, float] | None = None,
) -> dict:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError("The server could not decode this video.")
    source_width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    source_height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    duration = capture.get(cv2.CAP_PROP_FRAME_COUNT) / fps
    if not source_width or not source_height or duration <= 0:
        capture.release()
        raise RuntimeError("Video duration or dimensions could not be read.")
    scale = min(1.0, WORK_WIDTH / source_width)
    width = max(1, round(source_width * scale))
    height = max(1, round(source_height * scale))
    hoop = None
    if manual_hoop:
        hoop = (manual_hoop[0] * width, manual_hoop[1] * height, width * 0.03)

    stride = max(1, round(fps / 10))
    previous_gray = None
    samples = []
    frame_index = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if frame_index % stride == 0:
            resized = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA) if scale < 1 else frame
            if hoop is None:
                hoop = detect_rim(resized)
            if hoop is not None:
                candidates, previous_gray = ball_candidates(resized, previous_gray, hoop)
                samples.append((frame_index / fps, candidates))
        frame_index += 1
    capture.release()
    if hoop is None:
        raise RuntimeError("Could not find the rim. Mark its center in the clip and scan again.")
    return {
        "suggestions": classify_tracks(link_candidates(samples), hoop),
        "hoop": {"x": hoop[0] / width, "y": hoop[1] / height, "halfWidth": hoop[2] / width},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video")
    parser.add_argument("--hoop-x", type=float)
    parser.add_argument("--hoop-y", type=float)
    args = parser.parse_args()
    manual = None
    if args.hoop_x is not None or args.hoop_y is not None:
        if args.hoop_x is None or args.hoop_y is None or not (0 <= args.hoop_x <= 1 and 0 <= args.hoop_y <= 1):
            raise SystemExit("Both hoop coordinates must be normalized between 0 and 1.")
        manual = (args.hoop_x, args.hoop_y)
    try:
        print(json.dumps(analyze_video(args.video, manual)))
    except Exception as error:
        raise SystemExit(str(error)) from error


if __name__ == "__main__":
    main()
