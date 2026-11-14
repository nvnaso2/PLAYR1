export type ShotSuggestion = {
  startSeconds: number;
  endSeconds: number;
  result: "possible_make" | "possible_miss" | "uncertain";
  reason: string;
};
export type ShotAnalysisResult = {
  suggestions: ShotSuggestion[];
  hoop: { x: number; y: number; halfWidth: number };
};
export type ManualHoopLocation = { x: number; y: number };

type Point = { time: number; x: number; y: number };
type Candidate = { x: number; y: number; area: number };
type Track = { points: Point[] };

const WORK_WIDTH = 360;
type HoopGeometry = { x: number; y: number; halfWidth: number; netY: number };
const TEST_HOOP: HoopGeometry = { x: 77, y: 123, halfWidth: 9, netY: 148 };

export function getAnalysisFrameSize(videoWidth: number, videoHeight: number) {
  return {
    width: WORK_WIDTH,
    height: Math.max(1, Math.round(WORK_WIDTH * videoHeight / videoWidth)),
  };
}

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

export function detectHoop(image: ImageData): HoopGeometry | null {
  const { data, width, height } = image;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (max < 0.15 || delta / max < 0.2) continue;
    let hue = 0;
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
    if (hue <= 38 || hue >= 345) mask[p] = 1;
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const candidates: Array<{ x: number; y: number; width: number; height: number; area: number; score: number }> = [];
  for (let seed = 0; seed < mask.length; seed++) {
    if (!mask[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    visited[seed] = 1;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let sumX = 0, sumY = 0;
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
          const nx = x + dx, ny = y + dy;
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
    const aspect = boxWidth / boxHeight;
    const centerX = sumX / tail;
    const centerY = sumY / tail;
    if (tail < 12 || tail > 1200 || boxWidth < 8 || boxHeight < 3 ||
        aspect < 1.3 || aspect > 5.5 || boxWidth > width * 0.25 ||
        boxHeight > height * 0.06 || centerY < height * 0.12 ||
        centerY > height * 0.7) continue;
    const aspectScore = Math.max(0.2, 1 - Math.abs(aspect - 2.2) / 4);
    const centerScore = Math.max(0.5, 1 - Math.abs(centerX / width - 0.5));
    const heightScore = Math.max(0.25, 1 - 4.5 * Math.abs(centerY / height - 0.38));
    candidates.push({
      x: centerX, y: centerY, width: boxWidth, height: boxHeight, area: tail,
      score: Math.pow(tail, 0.15) * aspectScore * centerScore * centerScore * heightScore,
    });
  }
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) return null;
  const halfWidth = Math.max(4, best.width * 0.35);
  return {
    x: best.x,
    y: best.y,
    halfWidth,
    netY: best.y + Math.max(best.height * 1.1, halfWidth * 1.8),
  };
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

export function isShotArc(points: Point[], hoop = TEST_HOOP): boolean {
  if (points.length < 5 || points[0].y < hoop.y + 12 || points.at(-1)!.y < hoop.y + 8) return false;
  const up = upwardCrossing(points, hoop.y);
  const down = downwardCrossing(points, hoop.y);
  if (!up || !down || down.time <= up.time) return false;
  const apex = points.reduce((best, point) => point.y < best.y ? point : best, points[0]);
  if (apex.y > hoop.y - 25 || apex.time <= up.time || apex.time >= down.time) return false;
  if (down.x < hoop.x - hoop.halfWidth * 5 || down.x > hoop.x + hoop.halfWidth * 5) return false;
  return down.time - up.time >= 0.12;
}

export function classifyShotPath(
  points: Point[],
  hoop = TEST_HOOP,
): ShotSuggestion["result"] {
  const rim = downwardCrossing(points, hoop.y);
  const net = downwardCrossing(points, hoop.netY);
  if (rim && (rim.x < hoop.x - hoop.halfWidth * 1.5 ||
      rim.x > hoop.x + hoop.halfWidth * 1.5)) {
    return "possible_miss";
  }
  if (rim && net && net.time > rim.time &&
      Math.abs(rim.x - hoop.x) <= hoop.halfWidth &&
      Math.abs(net.x - hoop.x) <= hoop.halfWidth) {
    return "possible_make";
  }
  if (rim && !net) {
    const afterRim = points.filter((point) => point.time >= rim.time);
    for (let i = 1; i < afterRim.length; i++) {
      const first = afterRim[i - 1];
      const second = afterRim[i];
      if (first.y >= hoop.y && second.y < first.y - 12) return "possible_miss";
    }
  }
  return "uncertain";
}

export async function analyzeShootingVideo(
  url: string,
  onProgress: (progress: number) => void,
  manualHoop?: ManualHoopLocation,
): Promise<ShotAnalysisResult> {
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
    if (!video.videoWidth || !video.videoHeight) throw new Error("Video dimensions could not be read.");
    canvas.height = getAnalysisFrameSize(video.videoWidth, video.videoHeight).height;
    const samples: Array<{ time: number; candidates: Candidate[] }> = [];
    let nextSampleAt = 0;
    let lastProgress = 0;
    let previousGray: Uint8Array | null = null;
    let hoop: HoopGeometry | null = manualHoop ? {
      x: manualHoop.x * canvas.width,
      y: manualHoop.y * canvas.height,
      halfWidth: canvas.width * 0.03,
      netY: manualHoop.y * canvas.height + canvas.width * 0.054,
    } : null;
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
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            hoop ??= detectHoop(image);
            const frame = ballCandidates(image, previousGray);
            previousGray = frame.gray;
            samples.push({
              time: video.currentTime,
              candidates: samples.length ? frame.candidates : [],
            });
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
    const detectedHoop = hoop as HoopGeometry | null;
    if (!detectedHoop) {
      throw new Error("Could not locate the rim automatically. Tap Set hoop location and mark its center.");
    }

    const tracks = linkCandidates(samples).filter((track) => {
      const points = track.points;
      if (points.length < 4) return false;
      const start = points[0].time;
      const end = points.at(-1)!.time;
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));
      const nearRim = points.some((point) =>
        Math.abs(point.x - detectedHoop.x) <= detectedHoop.halfWidth * 3 &&
        Math.abs(point.y - detectedHoop.y) <= detectedHoop.halfWidth * 4);
      return end - start >= 0.25 && end - start <= 2.3 &&
        maxY - minY >= Math.max(35, detectedHoop.halfWidth * 3) && nearRim &&
        minY <= detectedHoop.y - Math.max(25, detectedHoop.halfWidth * 2.5) &&
        maxY >= detectedHoop.y + 12;
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
    const suggestions = events.filter((event) => isShotArc(event.points, detectedHoop)).map((event) => {
      const points = event.points;
      const result = classifyShotPath(points, detectedHoop);
      const release = upwardCrossing(points, detectedHoop.y);
      const rim = downwardCrossing(points, detectedHoop.y);
      return {
        startSeconds: Math.max(0, (release?.time ?? points[0].time) - 0.5),
        endSeconds: (rim?.time ?? points.at(-1)!.time) + 0.3,
        result,
        reason: result === "possible_make"
          ? "The tracked path appears to pass downward through the rim and net bands."
          : result === "possible_miss"
            ? "The tracked path appears to pass clearly outside the located rim opening."
            : "The clip does not show a clear enough rim-to-net path to label this attempt.",
      };
    });
    return {
      suggestions,
      hoop: {
        x: detectedHoop.x / canvas.width,
        y: detectedHoop.y / canvas.height,
        halfWidth: detectedHoop.halfWidth / canvas.width,
      },
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}
