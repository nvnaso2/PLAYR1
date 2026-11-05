import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";
import introTrailer from "@assets/Welcome_To_PLAYR1_1781991119550.mp4";

export function OnboardingTrailerStep({ previewMode = false }: { previewMode?: boolean }) {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [skipVisible, setSkipVisible] = useState(false);
  const continueOnboarding = () => {
    navigate(previewMode ? "/admin/onboarding-preview?page=hub" : "/coach-p?welcomeWorkout=1");
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSkipVisible(true), 5000);
    videoRef.current?.play().catch(() => undefined);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white" data-testid="onboarding-welcome-video-step">
      <video
        ref={videoRef}
        src={introTrailer}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={continueOnboarding}
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="PLAYR1 welcome video"
      />
      {previewMode && <OnboardingPreviewMenu page="welcome" />}
      {skipVisible && (
        <button
          type="button"
          onClick={continueOnboarding}
          className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] right-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/45 bg-black/45 px-4 text-xs font-bold text-white/95 shadow-lg backdrop-blur transition hover:bg-black/70"
          data-testid="button-skip-welcome-video"
        >
          Skip <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </main>
  );
}
