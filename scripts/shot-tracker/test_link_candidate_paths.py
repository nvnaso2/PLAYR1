import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("link_candidate_paths.py")
SPEC = importlib.util.spec_from_file_location("link_candidate_paths", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def point(frame: int, x: float, y: float) -> dict[str, float]:
    return {
        "frame": float(frame),
        "time_seconds": frame / 30,
        "x": x,
        "y": y,
        "area": 100,
        "circularity": 0.8,
    }


class CandidatePathTests(unittest.TestCase):
    def test_links_smooth_motion_and_keeps_separate_path(self) -> None:
        rows = [
            {"frame": str(p["frame"]), "time_seconds": str(p["time_seconds"]),
             "x_pixels": str(p["x"]), "y_pixels": str(p["y"]),
             "area": str(p["area"]), "circularity": str(p["circularity"])}
            for p in [
                point(0, 100, 500), point(2, 120, 470), point(4, 140, 440),
                point(0, 700, 500), point(2, 700, 520), point(4, 700, 540),
            ]
        ]
        tracks = MODULE.link_rows(rows, fps=30, max_gap=4, max_speed=1000)
        lengths = sorted(len(track.points) for track in tracks)
        self.assertEqual(lengths, [3, 3])

    def test_expires_path_after_configured_gap(self) -> None:
        rows = [
            {"frame": str(p["frame"]), "time_seconds": str(p["time_seconds"]),
             "x_pixels": str(p["x"]), "y_pixels": str(p["y"]),
             "area": str(p["area"]), "circularity": str(p["circularity"])}
            for p in [point(0, 100, 500), point(2, 120, 470), point(30, 150, 430)]
        ]
        tracks = MODULE.link_rows(rows, fps=30, max_gap=4, max_speed=1000)
        self.assertEqual(sorted(len(track.points) for track in tracks), [1, 2])


if __name__ == "__main__":
    unittest.main()
