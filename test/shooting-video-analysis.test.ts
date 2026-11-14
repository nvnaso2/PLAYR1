import test from "node:test";
import assert from "node:assert/strict";
import {
  ballCandidates,
  classifyShotPath,
  detectHoop,
  getAnalysisFrameSize,
  isShotArc,
  linkCandidates,
} from "../client/src/lib/shooting-video-analysis";

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

test("keeps portrait video dimensions instead of stretching to landscape", () => {
  assert.deepEqual(getAnalysisFrameSize(2160, 3840), { width: 360, height: 640 });
});

test("finds the centered red rim rather than a matching red object farther away", () => {
  const width = 360;
  const height = 640;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const addRedRectangle = (left: number, top: number, w: number, h: number) => {
    for (let y = top; y < top + h; y++) {
      for (let x = left; x < left + w; x++) {
        const index = (y * width + x) * 4;
        data[index] = 220;
        data[index + 1] = 45;
        data[index + 2] = 35;
      }
    }
  };
  addRedRectangle(20, 205, 28, 9);
  addRedRectangle(166, 240, 28, 12);
  const hoop = detectHoop({ data, width, height } as ImageData);
  assert.ok(hoop);
  assert.ok(Math.abs(hoop.x - 179.5) < 1);
  assert.ok(Math.abs(hoop.y - 245.5) < 1);
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

test("accepts a complete rise-apex-descent shot arc", () => {
  assert.equal(isShotArc([
    { time: 0, x: 100, y: 200 },
    { time: 0.1, x: 94, y: 160 },
    { time: 0.2, x: 87, y: 100 },
    { time: 0.3, x: 80, y: 70 },
    { time: 0.4, x: 78, y: 95 },
    { time: 0.5, x: 77, y: 123 },
    { time: 0.6, x: 76, y: 155 },
  ]), true);
});

test("rejects a rebound or dribble without a complete shot arc", () => {
  assert.equal(isShotArc([
    { time: 0, x: 77, y: 100 },
    { time: 0.1, x: 78, y: 123 },
    { time: 0.2, x: 79, y: 140 },
    { time: 0.3, x: 78, y: 119 },
  ]), false);
  assert.equal(isShotArc([
    { time: 0, x: 150, y: 200 },
    { time: 0.1, x: 151, y: 170 },
    { time: 0.2, x: 150, y: 190 },
    { time: 0.3, x: 150, y: 155 },
  ]), false);
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
