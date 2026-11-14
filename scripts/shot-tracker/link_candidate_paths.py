"""Link frame-level ball candidates into short, reviewable motion paths.

This is an offline diagnostic, not a make/miss classifier. Candidate detections
are noisy, so the output deliberately preserves ambiguous paths for review.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Track:
    track_id: int
    points: list[dict[str, float]] = field(default_factory=list)

    @property
    def last(self) -> dict[str, float]:
        return self.points[-1]


def link_rows(rows: list[dict[str, str]], fps: float, max_gap: int, max_speed: float) -> list[Track]:
    frames: dict[int, list[dict[str, float]]] = {}
    for row in rows:
        point = {
            "frame": float(row["frame"]),
            "time_seconds": float(row["time_seconds"]),
            "x": float(row["x_pixels"]),
            "y": float(row["y_pixels"]),
            "area": float(row["area"]),
            "circularity": float(row["circularity"]),
        }
        frames.setdefault(int(point["frame"]), []).append(point)

    active: list[Track] = []
    complete: list[Track] = []
    next_id = 1
    for frame_no in sorted(frames):
        current = frames[frame_no]
        expired = [
            track for track in active
            if frame_no - int(track.last["frame"]) > max_gap
        ]
        complete.extend(expired)
        active = [track for track in active if track not in expired]
        pairs: list[tuple[float, Track, dict[str, float]]] = []
        for track in active:
            previous = track.last
            dt = max((frame_no - int(previous["frame"])) / fps, 1 / fps)
            if len(track.points) >= 2:
                earlier = track.points[-2]
                old_dt = max(previous["time_seconds"] - earlier["time_seconds"], 1 / fps)
                vx = (previous["x"] - earlier["x"]) / old_dt
                vy = (previous["y"] - earlier["y"]) / old_dt
                predicted_x = previous["x"] + vx * dt
                predicted_y = previous["y"] + vy * dt
            else:
                predicted_x, predicted_y = previous["x"], previous["y"]
            max_distance = max_speed * dt + 28
            for point in current:
                distance = ((point["x"] - predicted_x) ** 2 + (point["y"] - predicted_y) ** 2) ** 0.5
                if distance <= max_distance:
                    pairs.append((distance, track, point))

        used_tracks: set[int] = set()
        used_points: set[int] = set()
        for _, track, point in sorted(pairs, key=lambda pair: pair[0]):
            point_key = id(point)
            if track.track_id in used_tracks or point_key in used_points:
                continue
            track.points.append(point)
            used_tracks.add(track.track_id)
            used_points.add(point_key)

        for point in current:
            if id(point) not in used_points:
                track = Track(next_id, [point])
                next_id += 1
                active.append(track)

    complete.extend(active)
    return complete


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidates_csv", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fps", type=float, required=True, help="Source video frame rate")
    parser.add_argument("--max-gap", type=int, default=8, help="Maximum missing source frames")
    parser.add_argument("--max-speed", type=float, default=2200, help="Maximum image-space pixels per second")
    parser.add_argument("--min-points", type=int, default=3)
    parser.add_argument("--min-travel", type=float, default=100, help="Minimum start-to-end pixels")
    args = parser.parse_args()

    with args.candidates_csv.open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    tracks = link_rows(rows, args.fps, args.max_gap, args.max_speed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with args.output.open("w", newline="", encoding="utf-8") as target:
        writer = csv.writer(target)
        writer.writerow([
            "track_id", "start_seconds", "end_seconds", "point_count",
            "start_x", "start_y", "end_x", "end_y", "travel_pixels",
            "vertical_direction",
        ])
        for track in tracks:
            points = track.points
            if len(points) < args.min_points:
                continue
            first, last = points[0], points[-1]
            travel = ((last["x"] - first["x"]) ** 2 + (last["y"] - first["y"]) ** 2) ** 0.5
            if travel < args.min_travel:
                continue
            writer.writerow([
                track.track_id,
                round(first["time_seconds"], 3),
                round(last["time_seconds"], 3),
                len(points),
                round(first["x"], 1),
                round(first["y"], 1),
                round(last["x"], 1),
                round(last["y"], 1),
                round(travel, 1),
                "down" if last["y"] > first["y"] else "up",
            ])
            written += 1
    print(f"Linked {len(rows)} candidate detections into {written} moving paths: {args.output}")


if __name__ == "__main__":
    main()
