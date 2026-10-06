/**
 * PLAYR1 share utilities
 *
 * Mobile (iOS / Android):  Web Share API with image file → native OS share sheet
 *   → user picks Instagram, TikTok, Messages, etc. directly.
 *
 * Desktop:  auto-download the image + copy to clipboard + open the platform's
 *   compose / upload page so the user just pastes.
 */

export type SharePlatform = "instagram" | "twitter" | "facebook" | "tiktok" | "youtube";

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ── Try to copy the canvas image to the system clipboard ──────────────────────
async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

// ── Trigger a browser download of the canvas ──────────────────────────────────
function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function downloadPngBlob(blob: Blob, filename: string, canvas: HTMLCanvasElement): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    try {
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      return true;
    } catch {
      return false;
    }
  }
}

export type StoryImageShareResult = "shared" | "cancelled" | "downloaded" | "failed";
export type WorkoutStoryShareResult = StoryImageShareResult;

type StoryImageConfig = {
  filename: string;
  shareTitle: string;
  shareText: string;
  displayName: string;
  fallbackLabel: string;
  exportErrorTitle: string;
};

async function shareStoryImage(
  canvas: HTMLCanvasElement,
  config: StoryImageConfig,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
): Promise<StoryImageShareResult> {
  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    blob = null;
  }
  if (!blob) {
    toast({ title: config.exportErrorTitle, description: "Try downloading the image instead.", variant: "destructive" });
    return "failed";
  }

  const shareNavigator = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  let file: File | null = null;
  let canShareFile = false;
  try {
    if (typeof shareNavigator.share === "function" && typeof shareNavigator.canShare === "function") {
      file = new File([blob], config.filename, { type: "image/png" });
      canShareFile = shareNavigator.canShare({ files: [file] });
    }
  } catch {
    canShareFile = false;
  }

  if (canShareFile && file) {
    try {
      await shareNavigator.share({
        files: [file],
        title: config.shareTitle,
        text: config.shareText,
      });
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        toast({ title: "Share canceled", description: `The ${config.displayName.toLowerCase()} image was not sent.` });
        return "cancelled";
      }
      const downloaded = downloadPngBlob(blob, config.filename, canvas);
      toast({
        title: downloaded ? `${config.displayName} image downloaded` : `Could not save ${config.displayName.toLowerCase()} image`,
        description: downloaded
          ? `The share sheet could not complete. The ${config.displayName.toLowerCase()} image is saved so you can share it manually.`
          : "The share sheet could not complete, and the image could not be saved.",
        ...(downloaded ? {} : { variant: "destructive" as const }),
      });
      return downloaded ? "downloaded" : "failed";
    }
  }

  const downloaded = downloadPngBlob(blob, config.filename, canvas);
  toast({
    title: downloaded ? `${config.displayName} image downloaded` : `Could not save ${config.displayName.toLowerCase()} image`,
    description: downloaded
      ? `Image sharing is not supported here. The ${config.fallbackLabel} is ready to share from your downloads.`
      : `Image sharing is not supported here, and the ${config.fallbackLabel} could not be saved.`,
    ...(downloaded ? {} : { variant: "destructive" as const }),
  });
  return downloaded ? "downloaded" : "failed";
}

/**
 * Share a workout story as an image attachment through the native share sheet.
 * Unlike legacy share cards, this never opens a text-only or platform URL and
 * never treats a canceled share as a successful send.
 */
export function shareWorkoutStoryImage(
  canvas: HTMLCanvasElement,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
): Promise<WorkoutStoryShareResult> {
  return shareStoryImage(canvas, {
    filename: "playr1-workout-story.png",
    shareTitle: "PLAYR1 workout",
    shareText: "My completed workout on PLAYR1.",
    displayName: "Workout",
    fallbackLabel: "story image",
    exportErrorTitle: "Could not export story image",
  }, toast);
}

/**
 * Share a dashboard story as an image attachment through the native share sheet.
 * Unsupported file sharing downloads the image; cancellation is never reported as sent.
 */
export function shareDashboardStoryImage(
  canvas: HTMLCanvasElement,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
): Promise<StoryImageShareResult> {
  return shareStoryImage(canvas, {
    filename: "playr1-dashboard-story.png",
    shareTitle: "PLAYR1 dashboard",
    shareText: "My training dashboard recap on PLAYR1.",
    displayName: "Dashboard",
    fallbackLabel: "dashboard story image",
    exportErrorTitle: "Could not export dashboard story image",
  }, toast);
}

export type BasketballStatsStoryType = "career" | "season" | "game";

const BASKETBALL_STORY_LABELS: Record<BasketballStatsStoryType, string> = {
  career: "Career",
  season: "Season",
  game: "Game",
};

/**
 * Share one career, season, or game story as an image attachment. Unsupported
 * file sharing downloads the image; cancellation is never reported as sent.
 */
export function shareBasketballStatsStoryImage(
  canvas: HTMLCanvasElement,
  type: BasketballStatsStoryType,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
): Promise<StoryImageShareResult> {
  const label = BASKETBALL_STORY_LABELS[type];
  const slug = type === "career" ? "career" : type;
  return shareStoryImage(canvas, {
    filename: `playr1-${slug}-stats-story.png`,
    shareTitle: `PLAYR1 ${label.toLowerCase()} stats`,
    shareText: `My ${label.toLowerCase()} stats on PLAYR1.`,
    displayName: `${label} stats`,
    fallbackLabel: `${label.toLowerCase()} story image`,
    exportErrorTitle: `Could not export ${label.toLowerCase()} story image`,
  }, toast);
}

export type ProfileCardShareResult = "shared" | "cancelled" | "fallback" | "failed";

/**
 * Share both sides of the player's card as image attachments. When their card
 * is public, include its interactive, card-only URL in the share text as well.
 */
export async function shareProfileCardImages(
  frontCanvas: HTMLCanvasElement,
  backCanvas: HTMLCanvasElement,
  interactiveCardUrl: string | undefined,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
): Promise<ProfileCardShareResult> {
  const [frontBlob, backBlob] = await Promise.all([
    new Promise<Blob | null>((resolve) => {
      try { frontCanvas.toBlob(resolve, "image/png"); } catch { resolve(null); }
    }),
    new Promise<Blob | null>((resolve) => {
      try { backCanvas.toBlob(resolve, "image/png"); } catch { resolve(null); }
    }),
  ]);

  if (!frontBlob || !backBlob) {
    toast({
      title: "Could not export player card",
      description: "Try sharing the card again.",
      variant: "destructive",
    });
    return "failed";
  }

  let files: File[] | undefined;
  try {
    files = [
      new File([frontBlob], "playr1-player-card-front.png", { type: "image/png" }),
      new File([backBlob], "playr1-player-card-back.png", { type: "image/png" }),
    ];
  } catch {
    files = undefined;
  }
  const shareNavigator = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  let canShareFiles = false;
  try {
    canShareFiles = Boolean(files)
      && typeof shareNavigator.share === "function"
      && typeof shareNavigator.canShare === "function"
      && shareNavigator.canShare({ files });
  } catch {
    canShareFiles = false;
  }

  const shareText = interactiveCardUrl
    ? `Flip my interactive PLAYR1 player card: ${interactiveCardUrl}`
    : "My PLAYR1 player card.";

  if (canShareFiles) {
    try {
      await shareNavigator.share({
        files: files!,
        title: "PLAYR1 player card",
        text: shareText,
      });
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        toast({ title: "Share canceled", description: "Your player card was not sent." });
        return "cancelled";
      }
      return "fallback";
    }
  }

  return "fallback";
}

// ── Try the native Web Share API with a file attachment ───────────────────────
async function tryNativeShare(
  canvas: HTMLCanvasElement,
  platform: SharePlatform,
  text: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return false;
  const file = new File([blob], `playr1-${platform}.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "PLAYR1", text });
      return true;
    }
    // Fallback: share text + URL only (no image)
    await navigator.share({ title: "PLAYR1", text, url: "https://playr1basketball.replit.app" });
    return true;
  } catch (e) {
    if ((e as Error).name === "AbortError") return true; // user cancelled — not a failure
    return false;
  }
}

// Platform compose / upload URLs
const PLATFORM_URLS: Record<SharePlatform, (text: string) => string> = {
  instagram: () => "https://www.instagram.com",
  tiktok:    () => "https://www.tiktok.com/upload",
  twitter:   (text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`,
  facebook:  () => "https://www.facebook.com",
  youtube:   () => "https://studio.youtube.com/channel/community",
};

// Human-readable instructions shown in the toast
const PLATFORM_INSTRUCTIONS: Record<SharePlatform, { title: (copied: boolean) => string; desc: (copied: boolean) => string }> = {
  instagram: {
    title: (c) => c ? "Image saved & copied! 📋" : "Image downloaded!",
    desc:  (c) => c
      ? "Instagram opened → tap '+' to create a post, then paste your image (Ctrl+V / ⌘V)."
      : "Instagram opened → tap '+' and upload the downloaded image from your gallery.",
  },
  tiktok: {
    title: (c) => c ? "Image saved & copied! 📋" : "Image downloaded!",
    desc:  (c) => c
      ? "TikTok upload opened → click 'Upload' and paste or select your image."
      : "TikTok upload opened → click 'Upload' and select the downloaded image.",
  },
  twitter: {
    title: (c) => c ? "Image saved & copied! 📋" : "Image downloaded!",
    desc:  (c) => c
      ? "Tweet composer opened → paste the image (Ctrl+V / ⌘V) and hit Post!"
      : "Tweet composer opened → drag & drop or attach the downloaded image.",
  },
  facebook: {
    title: (c) => c ? "Image saved & copied! 📋" : "Image downloaded!",
    desc:  (c) => c
      ? "Facebook opened → create a post and paste your image (Ctrl+V / ⌘V)."
      : "Facebook opened → create a post and upload the downloaded image.",
  },
  youtube: {
    title: () => "Image downloaded!",
    desc:  () => "YouTube Studio opened → click 'Create post' and attach your image.",
  },
};

// ── Main entry point ──────────────────────────────────────────────────────────
export async function shareToSocialPlatform(
  platform: SharePlatform,
  canvas: HTMLCanvasElement,
  caption: string,
  cardType: string,
  toast: (opts: { title: string; description?: string }) => void,
) {
  const filename = `playr1-${cardType}-${platform}.png`;

  // ── Mobile: use native share sheet (best UX, opens IG/TikTok directly) ──
  if (isMobile()) {
    const shared = await tryNativeShare(canvas, platform, caption);
    if (shared) return;
    // If native share failed on mobile, fall through to download flow
  }

  // ── Desktop (or mobile fallback): download + clipboard + open platform ──
  downloadCanvas(canvas, filename);

  // Small delay so the download dialog doesn't block clipboard write
  await new Promise((r) => setTimeout(r, 200));

  const copied = await copyImageToClipboard(canvas);

  const info = PLATFORM_INSTRUCTIONS[platform];
  const url  = PLATFORM_URLS[platform](caption);
  window.open(url, "_blank", "noopener");

  toast({
    title: info.title(copied),
    description: info.desc(copied),
  });
}
