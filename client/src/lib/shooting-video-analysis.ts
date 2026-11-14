export type ShotSuggestion = {
  startSeconds: number;
  endSeconds: number;
  result: "possible_make" | "possible_miss" | "uncertain";
  reason: string;
};

type Point = { time: number; x: number; y: number };
type Candidate = { x: number; y: number; area: number };
type Track = { points: Point[] };

const WORK_WIDTH = 480;
const WORK_HEIGHT = 270;
const ROI = { x: 0.1, y: 0.05, right: 0.9, bottom: 0.92 };
const RIM_X = 77;
const RIM_LEFT = 68;
const RIM_RIGHT = 86;
const RIM_Y = 123;
const NET_Y = 148;

export function ballCandidates(
  image: ImageData,
  previousGray: Uint8Array | null,
): { candidates: Candidate[]; gray: Uint8Array } {
  const { data, width, height } = image;
  const colorMask = new Uint8Array(width * height);
  const gray = new Uint8Array(width * height);
  const rawMotion = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    if (previousGray && Math.abs(gray[p] - previousGray[p]) >= 18) rawMotion[p] = 1;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;
    if (saturation < 0.18 || max < 0.15 || delta < 0.03) continue;
    let hue = 0;
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
    if ((hue >= 0 && hue <= 56) || hue >= 345) colorMask[p] = 1;
  }

  const mask = new Uint8Array(width * height);
  if (!previousGray) {
    mask.set(colorMask);
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (!colorMask[index]) continue;
        for (let dy = -1; dy <= 1 && !mask[index]; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                rawMotion[ny * width + nx]) {
              mask[index] = 1;
              break;
            }
          }
        }
      }
    }
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const found: Candidate[] = [];
  for (let seed = 0; seed < mask.length; seed++) {
    if (!mask[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    visited[seed] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0, sumX = 0, sumY = 0;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      sumX += x; sumY += y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next] && !visited[next]) {
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }
    }
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const fill = tail / (boxWidth * boxHeight);
    if (tail < 4 || tail > 800 || boxWidth / boxHeight < 0.5 ||
        boxWidth / boxHeight > 2 || fill < 0.18) continue;
    found.push({ x: sumX / tail, y: sumY / tail, area: tail });
  }
  return { candidates: found, gray };
}

export function linkCandidates(samples: Array<{ time: number; candidates: Candidate[] }>): Track[] {
  const active: Track[] = [];
  const complete: Track[] = [];
  for (const sample of samples) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (sample.time - active[i].points.at(-1)!.time > 0.42) {
        complete.push(active[i]);
        active.splice(i, 1);
      }
    }
    const pairs: Array<{ distance: number; track: Track; candidate: Candidate }> = [];
    for (const track of active) {
      const points = track.points;
      const last = points.at(-1)!;
      const dt = Math.max(sample.time - last.time, 0.01);
      const previous = points.at(-2);
      const vx = previous ? (last.x - previous.x) / (last.time - previous.time) : 0;
      const vy = previous ? (last.y - previous.y) / (last.time - previous.time) : 0;
      const predictedX = last.x + vx * dt;
      const predictedY = last.y + vy * dt;
      for (const candidate of sample.candidates) {
        const distance = Math.hypot(candidate.x - predictedX, candidate.y - predictedY);
        if (distance <= 420 * dt + 18) pairs.push({ distance, track, candidate });
      }
    }
    const usedTracks = new Set<Track>();
    const usedCandidates = new Set<Candidate>();
    for (const pair of pairs.sort((a, b) => a.distance - b.distance)) {
      if (usedTracks.has(pair.track) || usedCandidates.has(pair.candidate)) continue;
      pair.track.points.push({ time: sample.time, x: pair.candidate.x, y: pair.candidate.y });
      usedTracks.add(pair.track);
      usedCandidates.add(pair.candidate);
    }
    for (const candidate of sample.candidates) {
      if (!usedCandidates.has(candidate)) {
        active.push({ points: [{ time: sample.time, x: candidate.x, y: candidate.y }] });
      }
    }
  }
  return [...complete, ...active];
}

function downwardCrossing(points: Point[], yLine: number): { time: number; x: number } | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.y <= a.y || a.y > yLine || b.y < yLine) continue;
    const ratio = (yLine - a.y) / (b.y - a.y);
    return { time: a.time + ratio * (b.time - a.time), x: a.x + ratio * (b.x - a.x) };
  }
  return null;
}

function upwardCrossing(points: Point[], yLine: number): { time: number; x: number } | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.y >= a.y || a.y < yLine || b.y > yLine) continue;
    const ratio = (yLine - a.y) / (b.y - a.y);
    return { time: a.time + ratio * (b.time - a.time), x: a.x + ratio * (b.x - a.x) };
  }
  return null;
}

export function isShotArc(points: Point[]): boolean {
  if (points.length < 5 || points[0].y < RIM_Y + 12 || points.at(-1)!.y < RIM_Y + 8) return false;
  const up = upwardCrossing(points, RIM_Y);
  const down = downwardCrossing(points, RIM_Y);
  if (!up || !down || down.time <= up.time) return false;
  const apex = points.reduce((best, point) => point.y < best.y ? point : best, points[0]);
  if (apex.y > RIM_Y - 25 || apex.time <= up.time || apex.time >= down.time) return false;
  if (down.x < RIM_LEFT - 48 || down.x > RIM_RIGHT + 48) return false;
  return down.time - up.time >= 0.12;
}

export function classifyShotPath(points: Point[]): ShotSuggestion["result"] {
  const rim = downwardCrossing(points, RIM_Y);
  const net = downwardCrossing(points, NET_Y);
  if (rim && (rim.x < RIM_LEFT - 10 || rim.x > RIM_RIGHT + 10)) {
    return "possible_miss";
  }
  if (rim && net && net.time > rim.time &&
      RIM_LEFT <= rim.x && rim.x <= RIM_RIGHT &&
      RIM_LEFT <= net.x && net.x <= RIM_RIGHT) {
    return "possible_make";
  }
  if (rim && !net) {
    const afterRim = points.filter((point) => point.time >= rim.time);
    for (let i = 1; i < afterRim.length; i++) {
      const first = afterRim[i - 1];
      const second = afterRim[i];
      if (first.y >= RIM_Y && second.y < first.y - 12) return "possible_miss";
    }
  }
  return "uncertain";
}

export async function analyzeShootingVideo(
  url: string,
  onProgress: (progress: number) => void,
): Promise<ShotSuggestion[]> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.style.position = "fixed";
  video.style.left = "-10000px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.src = url;
  document.body.appendChild(video);
  const canvas = document.createElement("canvas");
  canvas.width = WORK_WIDTH;
  canvas.height = WORK_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot run local video analysis.");

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("This video could not be decoded.")), { once: true });
      video.load();
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Video duration could not be read.");
    const sx = Math.round(WORK_WIDTH * ROI.x);
    const sy = Math.round(WORK_HEIGHT * ROI.y);
    const sw = Math.round(WORK_WIDTH * (ROI.right - ROI.x));
    const sh = Math.round(WORK_HEIGHT * (ROI.bottom - ROI.y));
    const samples: Array<{ time: number; candidates: Candidate[] }> = [];
    let nextSampleAt = 0;
    let lastProgress = 0;
    let previousGray: Uint8Array | null = null;
    video.playbackRate = 3;
    await video.play();

    await new Promise<void>((resolve, reject) => {
      let animation = 0;
      const fail = () => {
        cancelAnimationFrame(animation);
        reject(new Error("Could not read video pixels. Check that the clip is still available and try again."));
      };
      const tick = () => {
        if (video.error) return fail();
        if (video.ended || video.currentTime >= duration) {
          cancelAnimationFrame(animation);
          resolve();
          return;
        }
        if (video.currentTime >= nextSampleAt) {
          try {
            context.drawImage(video, 0, 0, WORK_WIDTH, WORK_HEIGHT);
            const image = context.getImageData(sx, sy, sw, sh);
            const frame = ballCandidates(image, previousGray);
            previousGray = frame.gray;
            samples.push({ time: video.currentTime, candidates: frame.candidates });
          } catch {
            return fail();
          }
          nextSampleAt = video.currentTime + 0.1;
          const progress = Math.min(99, Math.floor((video.currentTime / duration) * 100));
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    });
    onProgress(100);

    const tracks = linkCandidates(samples).filter((track) => {
      const points = track.points;
      if (points.length < 4) return false;
      const start = points[0].time;
      const end = points.at(-1)!.time;
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));
      const nearRim = points.some((point) => Math.abs(point.x - RIM_X) <= 42);
      return end - start >= 0.25 && end - start <= 2.3 &&
        maxY - minY >= 35 && nearRim && minY <= RIM_Y - 25 && maxY >= RIM_Y + 12;
    }).sort((a, b) => a.points[0].time - b.points[0].time);

    const events: Track[] = [];
    for (const track of tracks) {
      const event = events.at(-1);
      const start = track.points[0].time;
      if (event && start - event.points.at(-1)!.time <= 1.1) {
        event.points.push(...track.points);
        event.points.sort((a, b) => a.time - b.time);
      } else {
        events.push({ points: [...track.points] });
      }
    }
    return events.filter((event) => isShotArc(event.points)).map((event) => {
      const points = event.points;
      const result = classifyShotPath(points);
      const release = upwardCrossing(points, RIM_Y);
      const rim = downwardCrossing(points, RIM_Y);
      return {
        startSeconds: Math.max(0, (release?.time ?? points[0].time) - 0.5),
        endSeconds: (rim?.time ?? points.at(-1)!.time) + 0.3,
        result,
        reason: result === "possible_make"
          ? "The tracked path appears to pass downward through the rim and net bands."
          : result === "possible_miss"
            ? "The tracked path appears to pass clearly outside the calibrated rim opening."
            : "The clip does not show a clear enough rim-to-net path to label this attempt.",
      };
    });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}
