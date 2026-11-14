"""Conservative make/miss signals from linked paths and calibrated hoop geometry.

The image-space rule is only a candidate classifier: a camera view cannot prove
3D rim passage in every case. Paths without clear rim and net crossings remain
uncertain and must be reviewed.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Crossing:
    time_seconds: float
    x: float


def crossing(points: list[dict[str, float]], y_line: float) -> Crossing | None:
    for first, second in zip(points, points[1:]):
        if second["y"] <= first["y"] or not first["y"] <= y_line <= second["y"]:
            continue
        delta_y = second["y"] - first["y"]
        ratio = (y_line - first["y"]) / delta_y if delta_y else 0
        return Crossing(
            time_seconds=first["time_seconds"] + ratio * (second["time_seconds"] - first["time_seconds"]),
            x=first["x"] + ratio * (second["x"] - first["x"]),
        )
    return None


def classify_path(
    points: list[dict[str, float]],
    rim_left: float,
    rim_right: float,
    rim_y: float,
    net_y: float,
    miss_margin: float = 60,
) -> tuple[str, str]:
    rim = crossing(points, rim_y)
    net = crossing(points, net_y)
    if rim and net and net.time_seconds > rim.time_seconds:
        if rim_left <= rim.x <= rim_right and rim_left <= net.x <= rim_right:
            return "possible_make", "downward path crosses the rim and net bands inside the calibrated opening"
        if rim.x < rim_left - miss_margin or rim.x > rim_right + miss_margin:
            return "possible_miss", "downward path passes clearly outside the calibrated rim opening"
    return "uncertain", "no unambiguous rim-to-net or clear outside-rim passage"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("points_csv", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rim-left", type=float, required=True)
    parser.add_argument("--rim-right", type=float, required=True)
    parser.add_argument("--rim-y", type=float, required=True)
    parser.add_argument("--net-y", type=float, required=True)
    parser.add_argument("--min-points", type=int, default=8)
    args = parser.parse_args()

    grouped: dict[int, list[dict[str, float]]] = defaultdict(list)
    with args.points_csv.open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source):
            grouped[int(row["track_id"])].append({
                "frame": float(row["frame"]),
                "time_seconds": float(row["time_seconds"]),
                "x": float(row["x"]),
                "y": float(row["y"]),
            })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as target:
        writer = csv.writer(target)
        writer.writerow(["track_id", "start_seconds", "end_seconds", "points", "result", "reason"])
        for track_id, points in sorted(grouped.items(), key=lambda item: item[1][0]["time_seconds"]):
            if len(points) < args.min_points:
                continue
            result, reason = classify_path(
                points, args.rim_left, args.rim_right, args.rim_y, args.net_y
            )
            writer.writerow([
                track_id,
                round(points[0]["time_seconds"], 3),
                round(points[-1]["time_seconds"], 3),
                len(points),
                result,
                reason,
            ])
    print(f"Classified candidate paths conservatively: {args.output}")


if __name__ == "__main__":
    main()
