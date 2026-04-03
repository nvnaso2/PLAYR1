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
