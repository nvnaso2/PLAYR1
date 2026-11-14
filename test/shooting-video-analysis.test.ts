import test from "node:test";
import assert from "node:assert/strict";
import { ballCandidates, classifyShotPath, linkCandidates } from "../client/src/lib/shooting-video-analysis";

function orangeFrame(cx: number, cy: number): ImageData {
  const width = 180;
  const height = 180;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(235);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 7 ** 2) {
        const index = (y * width + x) * 4;
        data[index] = 225;
        data[index + 1] = 120;
        data[index + 2] = 30;
      }
    }
  }
  return { data, width, height } as ImageData;
}

test("finds a moving orange ball component in a fixed-camera crop", () => {
  const previous = new Uint8Array(180 * 180).fill(235);
  const detected = ballCandidates(orangeFrame(80, 70), previous);
  assert.equal(detected.candidates.length, 1);
  assert.ok(Math.abs(detected.candidates[0].x - 80) < 1);
  assert.ok(Math.abs(detected.candidates[0].y - 70) < 1);
});

test("links sampled ball positions into one moving path", () => {
  const tracks = linkCandidates([
    { time: 0, candidates: [{ x: 77, y: 90, area: 100 }] },
    { time: 0.1, candidates: [{ x: 78, y: 110, area: 102 }] },
    { time: 0.2, candidates: [{ x: 80, y: 132, area: 99 }] },
  ]);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].points.length, 3);
});

test("classifies a clear downward rim-to-net path as a possible make", () => {
  const points = [
    { time: 0, x: 77, y: 90 },
    { time: 0.1, x: 78, y: 120 },
    { time: 0.2, x: 77, y: 137 },
    { time: 0.3, x: 78, y: 160 },
  ];
  assert.equal(classifyShotPath(points), "possible_make");
});

test("classifies a clear outside-rim crossing as a possible miss", () => {
  const points = [
    { time: 0, x: 48, y: 90 },
    { time: 0.1, x: 49, y: 123 },
  ];
  assert.equal(classifyShotPath(points), "possible_miss");
});

test("classifies an inside-rim path that rebounds upward before the net as a possible miss", () => {
  const points = [
    { time: 0, x: 77, y: 100 },
    { time: 0.1, x: 78, y: 123 },
    { time: 0.2, x: 79, y: 139 },
    { time: 0.3, x: 78, y: 119 },
  ];
  assert.equal(classifyShotPath(points), "possible_miss");
});

test("leaves an incomplete or ambiguous crossing uncertain", () => {
  assert.equal(classifyShotPath([
    { time: 0, x: 77, y: 90 },
    { time: 0.1, x: 78, y: 120 },
  ]), "uncertain");
});
