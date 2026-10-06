import { useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { shareProfileCardImages } from "@/lib/share-utils";

type CardSide = "front" | "back";

async function renderCardSide(cardRoot: HTMLElement, side: CardSide) {
  const face = cardRoot.querySelector<HTMLElement>(`[data-player-card-face="${side}"]`);
  if (!face) throw new Error(`The player card ${side} is not available.`);
  if (document.fonts?.ready) await document.fonts.ready;

  return html2canvas(face, {
    width: 240,
    height: 340,
    scale: 2,
    backgroundColor: "#000000",
    useCORS: true,
    logging: false,
    onclone: (clonedDocument) => {
      const clonedFace = clonedDocument.querySelector<HTMLElement>(`[data-player-card-face="${side}"]`);
      if (!clonedFace) return;

      Object.assign(clonedFace.style, {
        position: "relative",
        left: "0px",
        top: "0px",
        transform: "none",
        backfaceVisibility: "visible",
        zIndex: "auto",
      });
      const flipper = clonedFace.parentElement;
      if (flipper?.hasAttribute("data-player-card-flipper")) {
        flipper.style.transform = "none";
        flipper.style.transformStyle = "flat";
        flipper.style.width = "240px";
        flipper.style.height = "340px";
        flipper.style.left = "0px";
        flipper.style.top = "0px";
      }
      const stage = flipper?.parentElement;
      if (stage) {
        stage.style.perspective = "none";
        stage.style.width = "240px";
        stage.style.height = "340px";
      }
      clonedFace.querySelector<HTMLElement>("[data-profile-card-share-ignore]")?.style.setProperty("display", "none");
    },
  });
}

export function ProfileCardShareButton({
  cardRef,
  slug,
  canShareInteractiveCard,
  className,
  testId = "button-share-profile-card",
}: {
  cardRef: RefObject<HTMLDivElement>;
  slug?: string | null;
  canShareInteractiveCard: boolean;
  className?: string;
  testId?: string;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [fallbackImages, setFallbackImages] = useState<{
    front: string;
    back: string;
    interactiveCardUrl?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleShare = async () => {
    if (isSharing) return;
    const cardRoot = cardRef.current;
    if (!cardRoot) {
      toast({
        title: "Player card is not ready",
        description: "Try again once the card has loaded.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      const [front, back] = await Promise.all([
        renderCardSide(cardRoot, "front"),
        renderCardSide(cardRoot, "back"),
      ]);
      const interactiveCardUrl = canShareInteractiveCard && slug
        ? `${window.location.origin}/player/${encodeURIComponent(slug)}/card`
        : undefined;
      const result = await shareProfileCardImages(front, back, interactiveCardUrl, toast);
      if (result === "fallback") {
        setFallbackImages({
          front: front.toDataURL("image/png"),
          back: back.toDataURL("image/png"),
          interactiveCardUrl,
        });
      }
    } catch {
      toast({
        title: "Could not prepare player card",
        description: "Try sharing the card again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={isSharing}
        title="Share the front and back of your player card"
        className={className}
        data-testid={testId}
      >
        {isSharing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 h-4 w-4" />}
        {isSharing ? "Preparing card…" : "Share card"}
      </Button>
      <Dialog open={Boolean(fallbackImages)} onOpenChange={(open) => { if (!open) setFallbackImages(null); }}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md" data-testid="profile-card-download-fallback">
          <DialogHeader>
            <DialogTitle>Download your card images</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Your browser couldn’t share both images directly. Download the front and back, then attach them to a message or Story.
            </DialogDescription>
          </DialogHeader>
          {fallbackImages && (
            <div className="grid gap-3">
              <a
                href={fallbackImages.front}
                download="playr1-player-card-front.png"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
                data-testid="download-player-card-front"
              >
                Download front
              </a>
              <a
                href={fallbackImages.back}
                download="playr1-player-card-back.png"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
                data-testid="download-player-card-back"
              >
                Download back
              </a>
              {fallbackImages.interactiveCardUrl && (
                <a
                  href={fallbackImages.interactiveCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center text-sm font-semibold text-orange-400 underline underline-offset-4 hover:text-orange-300"
                  data-testid="open-interactive-player-card"
                >
                  Open interactive card
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
