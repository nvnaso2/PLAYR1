import unittest

from analyze_rim_sequence import Track, classify_tracks, link_candidates


HOOP = (180.0, 240.0, 9.0)


class RimSequenceTests(unittest.TestCase):
    def test_counts_ball_continuing_below_rim_as_possible_make(self):
        track = Track([
            (0.0, 180, 145), (0.1, 180, 100), (0.2, 181, 200),
            (0.3, 180, 240), (0.4, 180, 270),
        ])
        result = classify_tracks([track], HOOP)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["result"], "possible_make")

    def test_marks_outside_rim_crossing_as_possible_miss(self):
        track = Track([
            (0.0, 180, 145), (0.1, 180, 100), (0.2, 215, 200),
            (0.3, 220, 240),
        ])
        result = classify_tracks([track], HOOP)
        self.assertEqual(result[0]["result"], "possible_miss")

    def test_keeps_hidden_or_ambiguous_rim_result_uncertain(self):
        track = Track([
            (0.0, 180, 145), (0.1, 180, 100), (0.2, 180, 200),
            (0.3, 180, 240),
        ])
        result = classify_tracks([track], HOOP)
        self.assertEqual(result[0]["result"], "uncertain")

    def test_ignores_movement_that_never_reaches_the_rim(self):
        track = Track([
            (0.0, 180, 145), (0.1, 180, 100), (0.2, 180, 150),
            (0.3, 180, 180),
        ])
        self.assertEqual(classify_tracks([track], HOOP), [])

    def test_links_ball_detections_across_short_occlusion(self):
        tracks = link_candidates([
            (0.0, [(180, 100)]),
            (0.1, [(180, 120)]),
            (0.4, [(180, 180)]),
            (0.5, [(180, 220)]),
        ])
        self.assertEqual(len(tracks), 1)
        self.assertEqual(len(tracks[0].points), 4)


if __name__ == "__main__":
    unittest.main()
