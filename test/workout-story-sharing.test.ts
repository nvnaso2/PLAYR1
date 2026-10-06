import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWorkoutShareDrills,
  calculateWorkoutShareTotals,
  getWorkoutShareLogShootingTotals,
  getWorkoutStoryDrillColumns,
  getWorkoutStoryIdentity,
  WORKOUT_STORY_SIZE,
} from "../shared/workout-story-data";
import {
  shareBasketballStatsStoryImage,
  shareDashboardStoryImage,
  shareProfileCardImages,
  shareWorkoutStoryImage,
} from "../client/src/lib/share-utils";
import { PgDialect } from "drizzle-orm/pg-core";
import { getWorkoutShareScope, resolveWorkoutShareSessionId } from "../server/workout-share-scope";

test("session recap totals preserve duration and aggregate makes and attempts", () => {
  assert.deepEqual(calculateWorkoutShareTotals([
    { duration: 24, shotsAttempted: 12, shotsMade: 8 },
    { duration: 0, shotsAttempted: 7, shotsMade: 3 },
    { duration: 0, shotsAttempted: null, shotsMade: null },
  ]), {
    drillCount: 3,
    totalDuration: 24,
    totalShotsAttempted: 19,
    totalShotsMade: 11,
    shootingPct: 58,
  });
});

test("session recap counts completed drills once when a drill has multiple rounds", () => {
  assert.equal(calculateWorkoutShareTotals([
    { drillId: "drill-a", duration: 18 },
    { drillId: "drill-a", duration: 0 },
    { drillId: "drill-b", duration: 0 },
  ]).drillCount, 2);
});

test("legacy metric-based shooting totals are used when direct shot fields are absent", () => {
  assert.deepEqual(getWorkoutShareLogShootingTotals({
    duration: 0,
    metrics: [
      { id: "attempts", name: "Shot Attempts", label: "Attempts", value: "12" },
      { id: "makes", name: "Shots Made", label: "Makes", value: "7" },
    ],
  }), { attempted: 12, made: 7 });
});

test("story image dimensions are vertical 9:16", () => {
  assert.deepEqual(WORKOUT_STORY_SIZE, { width: 1080, height: 1920 });
  assert.equal(WORKOUT_STORY_SIZE.width / WORKOUT_STORY_SIZE.height, 9 / 16);
});

test("a completed single-drill workout stays shareable without inventing shooting stats", () => {
  const logs = [{ duration: 8, shotsAttempted: null, shotsMade: null }];
  assert.deepEqual(calculateWorkoutShareTotals(logs), {
    drillCount: 1,
    totalDuration: 8,
    totalShotsAttempted: 0,
    totalShotsMade: 0,
    shootingPct: null,
  });
  assert.equal(buildWorkoutShareDrills(logs).length, 1);
  const [singleDrill] = buildWorkoutShareDrills(logs);
  assert.equal(singleDrill.shotsAttempted, null);
  assert.equal(singleDrill.shotsMade, null);
  assert.equal(singleDrill.shootingPct, null);
});

test("workout card identity uses saved profile fields and leaves missing identity blank", () => {
  assert.deepEqual(getWorkoutStoryIdentity({
    playerName: "  Jordan Player ",
    displayName: "  Jordan ",
    positions: [" PG ", "SG"],
    jerseyNumber: 12,
    teamName: " City Hoops ",
  }), {
    name: "Jordan",
    details: ["#12", "PG / SG", "City Hoops"],
  });
  assert.deepEqual(getWorkoutStoryIdentity({ positions: [], teamName: null }), {
    name: null,
    details: [],
  });
  assert.deepEqual(getWorkoutStoryIdentity({
    playerName: "",
    positions: ["PF"],
    jerseyNumber: 0,
  }), {
    name: null,
    details: ["#0", "PF"],
  });
});

test("workout story drill conversion retains every completed log in order", () => {
  const logs = Array.from({ length: 27 }, (_, index) => ({
    drillTitle: index === 0 ? "First drill" : `Drill ${index + 1}`,
    drillCategory: "shooting",
    duration: index === 0 ? 18 : 0,
    reps: null,
    sets: null,
    score: null,
    shotsAttempted: null,
    shotsMade: null,
  }));

  const drills = buildWorkoutShareDrills(logs);
  assert.equal(drills.length, logs.length);
  assert.equal(drills[0].title, "First drill");
  assert.equal(drills[26].title, "Drill 27");
  assert.equal(drills[0].duration, 18);
  const columns = getWorkoutStoryDrillColumns(drills);
  assert.deepEqual(columns.map((column) => column.length), [14, 13]);
  assert.deepEqual(columns.flat().map((drill) => drill.title), drills.map((drill) => drill.title));
});

test("workout story groups rounds into history-style drill summaries with actual stats", () => {
  const drills = buildWorkoutShareDrills([
    {
      id: "round-1",
      drillId: "drill-a",
      drillTitle: "Corner Catch and Shoot",
      drillCategory: "shooting",
      duration: 16,
      metrics: [
        { id: "attempts", name: "Shot Attempts", label: "Attempts", value: 12, unit: "shots" },
        { id: "makes", name: "Shots Made", label: "Makes", value: 8, unit: "shots" },
        { id: "reps", name: "Reps", label: "Reps", value: 20, unit: "reps" },
      ],
    },
    {
      id: "round-2",
      drillId: "drill-a",
      drillTitle: "Corner Catch and Shoot",
      drillCategory: "shooting",
      duration: 0,
      metrics: [
        { id: "attempts", name: "Shot Attempts", label: "Attempts", value: 10, unit: "shots" },
        { id: "makes", name: "Shots Made", label: "Makes", value: 6, unit: "shots" },
        { id: "reps", name: "Reps", label: "Reps", value: 18, unit: "reps" },
      ],
    },
  ]);

  assert.equal(drills.length, 1);
  assert.equal(drills[0].roundCount, 2);
  assert.equal(drills[0].duration, 16);
  assert.equal(drills[0].shotsAttempted, 22);
  assert.equal(drills[0].shotsMade, 14);
  assert.equal(drills[0].shootingPct, 64);
  assert.deepEqual(drills[0].metrics.find((metric) => metric.id === "reps")?.values, [20, 18]);
});

test("workout share lookup is owner-scoped and supports legacy log IDs", () => {
  const query = new PgDialect().sqlToQuery(getWorkoutShareScope("player-a", "legacy-log-id"));

  assert.match(query.sql, /"training_logs"\."user_id" = \$1/);
  assert.match(query.sql, /"training_logs"\."workout_session_id" = \$2/);
  assert.match(query.sql, /"training_logs"\."id" = \$3/);
  assert.match(query.sql, /"training_logs"\."workout_session_id" is null/i);
  assert.deepEqual(query.params, ["player-a", "legacy-log-id", "legacy-log-id"]);
});

test("workout share IDs resolve modern log references to their full session and preserve legacy IDs", () => {
  assert.equal(resolveWorkoutShareSessionId("session-a", [
    { id: "log-a", workoutSessionId: "session-a" },
    { id: "log-b", workoutSessionId: "session-a" },
  ]), "session-a");
  assert.equal(resolveWorkoutShareSessionId("log-a", [
    { id: "log-a", workoutSessionId: "session-a" },
  ]), "session-a");
  assert.equal(resolveWorkoutShareSessionId("legacy-log", [
    { id: "legacy-log", workoutSessionId: null },
  ]), "legacy-log");
});

type ShareMock = (data: ShareData) => Promise<void>;

function installBrowserMocks(options: {
  canShare?: (data?: ShareData) => boolean;
  share?: ShareMock;
}) {
  const keys = ["navigator", "document", "window", "File"] as const;
  const originals = new Map<string, PropertyDescriptor | undefined>(
    keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const downloads: Array<{ download: string; href: string; clicked: boolean }> = [];
  const toasts: Array<{ title: string; description?: string; variant?: "destructive" }> = [];

  class TestFile extends Blob {
    readonly name: string;
    readonly lastModified = 0;
    constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
      super(parts, options);
      this.name = name;
    }
  }

  Object.defineProperty(globalThis, "File", { configurable: true, writable: true, value: TestFile });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      userAgent: "Unit Test",
      canShare: options.canShare,
      share: options.share,
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement: () => {
        const link = { download: "", href: "", clicked: false, click() { this.clicked = true; } };
        downloads.push(link);
        return link;
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { setTimeout: (callback: () => void) => { callback(); return 0; } },
  });

  return {
    downloads,
    toasts,
    toast: (message: { title: string; description?: string; variant?: "destructive" }) => toasts.push(message),
    restore() {
      for (const key of keys) {
        const descriptor = originals.get(key);
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

function makeCanvas(attemptExport = true): HTMLCanvasElement {
  return {
    width: 1080,
    height: 1920,
    toBlob(callback: BlobCallback) {
      callback(attemptExport ? new Blob(["story"], { type: "image/png" }) : null);
    },
  } as HTMLCanvasElement;
}

test("story image exports as a PNG file through the native share sheet", async () => {
  let sharedData: ShareData | undefined;
  const browser = installBrowserMocks({
    canShare: (data) => Boolean(data?.files?.length),
    share: async (data) => { sharedData = data; },
  });

  try {
    assert.equal(await shareWorkoutStoryImage(makeCanvas(), browser.toast), "shared");
    const file = sharedData?.files?.[0];
    assert.equal(file?.name, "playr1-workout-story.png");
    assert.equal(file?.type, "image/png");
    assert.equal(file?.size, 5);
    assert.equal(browser.downloads.length, 0);
    assert.equal(browser.toasts.length, 0);
  } finally {
    browser.restore();
  }
});

test("canceling the native share sheet is reported as canceled, not sent or downloaded", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => { throw Object.assign(new Error("dismissed"), { name: "AbortError" }); },
  });

  try {
    assert.equal(await shareWorkoutStoryImage(makeCanvas(), browser.toast), "cancelled");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.title ?? "", /canceled/i);
    assert.match(browser.toasts[0]?.description ?? "", /not sent/i);
  } finally {
    browser.restore();
  }
});

test("unsupported file sharing downloads the image with a clear fallback message", async () => {
  const browser = installBrowserMocks({ canShare: () => false });

  try {
    assert.equal(await shareWorkoutStoryImage(makeCanvas(), browser.toast), "downloaded");
    assert.equal(browser.downloads.length, 1);
    assert.equal(browser.downloads[0].download, "playr1-workout-story.png");
    assert.equal(browser.downloads[0].clicked, true);
    assert.match(browser.toasts[0]?.title ?? "", /downloaded/i);
    assert.match(browser.toasts[0]?.description ?? "", /not supported/i);
  } finally {
    browser.restore();
  }
});

test("an image export failure is reported without a false share or download", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => assert.fail("share should not be called when image export fails"),
  });

  try {
    assert.equal(await shareWorkoutStoryImage(makeCanvas(false), browser.toast), "failed");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.title ?? "", /could not export/i);
  } finally {
    browser.restore();
  }
});

test("share-sheet errors fall back to an image download instead of claiming a send", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => { throw new Error("share unavailable"); },
  });

  try {
    assert.equal(await shareWorkoutStoryImage(makeCanvas(), browser.toast), "downloaded");
    assert.equal(browser.downloads.length, 1);
    assert.equal(browser.downloads[0].clicked, true);
    assert.match(browser.toasts[0]?.title ?? "", /downloaded/i);
    assert.match(browser.toasts[0]?.description ?? "", /could not complete/i);
  } finally {
    browser.restore();
  }
});

test("dashboard story exports a PNG attachment with dashboard share metadata", async () => {
  let sharedData: ShareData | undefined;
  const browser = installBrowserMocks({
    canShare: (data) => Boolean(data?.files?.length),
    share: async (data) => { sharedData = data; },
  });

  try {
    assert.equal(await shareDashboardStoryImage(makeCanvas(), browser.toast), "shared");
    assert.equal(sharedData?.files?.[0]?.name, "playr1-dashboard-story.png");
    assert.equal(sharedData?.files?.[0]?.type, "image/png");
    assert.equal(sharedData?.title, "PLAYR1 dashboard");
    assert.equal(sharedData?.text, "My training dashboard recap on PLAYR1.");
    assert.equal(browser.downloads.length, 0);
    assert.equal(browser.toasts.length, 0);
  } finally {
    browser.restore();
  }
});

test("career, season, and game story cards share distinct PNG files with native sheet metadata", async () => {
  const variants = [
    { type: "career" as const, filename: "playr1-career-stats-story.png", title: "PLAYR1 career stats", text: "My career stats on PLAYR1." },
    { type: "season" as const, filename: "playr1-season-stats-story.png", title: "PLAYR1 season stats", text: "My season stats on PLAYR1." },
    { type: "game" as const, filename: "playr1-game-stats-story.png", title: "PLAYR1 game stats", text: "My game stats on PLAYR1." },
  ];

  for (const variant of variants) {
    let sharedData: ShareData | undefined;
    const browser = installBrowserMocks({
      canShare: (data) => Boolean(data?.files?.length),
      share: async (data) => { sharedData = data; },
    });

    try {
      assert.equal(await shareBasketballStatsStoryImage(makeCanvas(), variant.type, browser.toast), "shared");
      assert.equal(sharedData?.files?.[0]?.name, variant.filename);
      assert.equal(sharedData?.files?.[0]?.type, "image/png");
      assert.equal(sharedData?.title, variant.title);
      assert.equal(sharedData?.text, variant.text);
      assert.equal(browser.downloads.length, 0);
      assert.equal(browser.toasts.length, 0);
    } finally {
      browser.restore();
    }
  }
});

test("canceling a basketball stats story share does not claim a send or start a download", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => { throw Object.assign(new Error("dismissed"), { name: "AbortError" }); },
  });

  try {
    assert.equal(await shareBasketballStatsStoryImage(makeCanvas(), "game", browser.toast), "cancelled");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.title ?? "", /share canceled/i);
    assert.match(browser.toasts[0]?.description ?? "", /game stats image was not sent/i);
  } finally {
    browser.restore();
  }
});

test("unsupported basketball story file sharing downloads the image with a manual-share message", async () => {
  const browser = installBrowserMocks({ canShare: () => false });

  try {
    assert.equal(await shareBasketballStatsStoryImage(makeCanvas(), "season", browser.toast), "downloaded");
    assert.equal(browser.downloads.length, 1);
    assert.equal(browser.downloads[0]?.download, "playr1-season-stats-story.png");
    assert.equal(browser.downloads[0]?.clicked, true);
    assert.match(browser.toasts[0]?.title ?? "", /season stats image downloaded/i);
    assert.match(browser.toasts[0]?.description ?? "", /season story image is ready to share from your downloads/i);
  } finally {
    browser.restore();
  }
});

test("profile card sharing sends both sides and includes the interactive public-card link", async () => {
  let sharedData: ShareData | undefined;
  const browser = installBrowserMocks({
    canShare: (data) => Boolean(data?.files?.length === 2),
    share: async (data) => { sharedData = data; },
  });

  try {
    assert.equal(
      await shareProfileCardImages(makeCanvas(), makeCanvas(), "https://playr1.example/player/jordan/card", browser.toast),
      "shared",
    );
    assert.deepEqual(
      sharedData?.files?.map((file) => file.name),
      ["playr1-player-card-front.png", "playr1-player-card-back.png"],
    );
    assert.match(sharedData?.text ?? "", /\/player\/jordan\/card/);
    assert.equal(browser.downloads.length, 0);
  } finally {
    browser.restore();
  }
});

test("canceling profile-card sharing is not reported as a successful send", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => { throw Object.assign(new Error("dismissed"), { name: "AbortError" }); },
  });

  try {
    assert.equal(await shareProfileCardImages(makeCanvas(), makeCanvas(), undefined, browser.toast), "cancelled");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.title ?? "", /canceled/i);
    assert.match(browser.toasts[0]?.description ?? "", /not sent/i);
  } finally {
    browser.restore();
  }
});

test("unsupported profile-card file sharing reports a visible manual-download fallback", async () => {
  const browser = installBrowserMocks({ canShare: () => false });

  try {
    assert.equal(await shareProfileCardImages(makeCanvas(), makeCanvas(), undefined, browser.toast), "fallback");
    assert.equal(browser.downloads.length, 0);
    assert.equal(browser.toasts.length, 0);
  } finally {
    browser.restore();
  }
});

test("profile-card sharing provides a manual fallback when the File API is unavailable", async () => {
  const browser = installBrowserMocks({ canShare: () => true });
  Object.defineProperty(globalThis, "File", { configurable: true, writable: true, value: undefined });

  try {
    assert.equal(await shareProfileCardImages(makeCanvas(), makeCanvas(), undefined, browser.toast), "fallback");
    assert.equal(browser.downloads.length, 0);
    assert.equal(browser.toasts.length, 0);
  } finally {
    browser.restore();
  }
});

test("canceling dashboard story sharing is not reported as a successful send", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => { throw Object.assign(new Error("dismissed"), { name: "AbortError" }); },
  });

  try {
    assert.equal(await shareDashboardStoryImage(makeCanvas(), browser.toast), "cancelled");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.description ?? "", /dashboard image was not sent/i);
  } finally {
    browser.restore();
  }
});

test("unsupported dashboard file sharing downloads the image with a clear fallback", async () => {
  const browser = installBrowserMocks({ canShare: () => false });

  try {
    assert.equal(await shareDashboardStoryImage(makeCanvas(), browser.toast), "downloaded");
    assert.equal(browser.downloads.length, 1);
    assert.equal(browser.downloads[0].download, "playr1-dashboard-story.png");
    assert.match(browser.toasts[0]?.title ?? "", /dashboard image downloaded/i);
    assert.match(browser.toasts[0]?.description ?? "", /not supported/i);
  } finally {
    browser.restore();
  }
});

test("dashboard story export failures do not trigger sharing or claim a download", async () => {
  const browser = installBrowserMocks({
    canShare: () => true,
    share: async () => assert.fail("share should not be called when image export fails"),
  });

  try {
    assert.equal(await shareDashboardStoryImage(makeCanvas(false), browser.toast), "failed");
    assert.equal(browser.downloads.length, 0);
    assert.match(browser.toasts[0]?.title ?? "", /could not export dashboard story image/i);
  } finally {
    browser.restore();
  }
});
