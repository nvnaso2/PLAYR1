import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("classify_rim_crossings.py")
SPEC = importlib.util.spec_from_file_location("classify_rim_crossings", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def point(t: float, x: float, y: float) -> dict[str, float]:
    return {"time_seconds": t, "x": x, "y": y}


class RimCrossingTests(unittest.TestCase):
    def test_inside_rim_then_net_is_possible_make(self) -> None:
        points = [
            point(0.0, 1070, 1200),
            point(0.1, 1080, 1400),
            point(0.2, 1090, 1500),
            point(0.3, 1100, 1630),
        ]
        result, _ = MODULE.classify_path(points, 1000, 1200, 1450, 1600)
        self.assertEqual(result, "possible_make")

    def test_clear_outside_rim_is_possible_miss(self) -> None:
        points = [
            point(0.0, 850, 1200),
            point(0.1, 850, 1450),
            point(0.2, 860, 1600),
        ]
        result, _ = MODULE.classify_path(points, 1000, 1200, 1450, 1600)
        self.assertEqual(result, "possible_miss")

    def test_missing_or_ambiguous_crossing_stays_uncertain(self) -> None:
        points = [point(0.0, 1100, 1100), point(0.1, 1100, 1300)]
        result, _ = MODULE.classify_path(points, 1000, 1200, 1450, 1600)
        self.assertEqual(result, "uncertain")


if __name__ == "__main__":
    unittest.main()
