import { useState } from "react";
import { useLocation } from "wouter";
import { OnboardingWizard } from "./career";
import { Button } from "@/components/ui/button";
import { Eye, X, RotateCcw, CheckCircle2 } from "lucide-react";

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);

  const handleRestart = () => {
    setDone(false);
    setKey(k => k + 1);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Fixed preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-orange-500/95 backdrop-blur text-black text-sm font-semibold shadow-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 shrink-0" />
          PREVIEW MODE — No data is being saved
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 px-2 py-1 rounded bg-black/15 hover:bg-black/25 transition-colors text-xs font-semibold"
            data-testid="button-restart-preview"
          >
            <RotateCcw className="w-3 h-3" />
            Restart
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1 px-2 py-1 rounded bg-black/15 hover:bg-black/25 transition-colors text-xs font-semibold"
            data-testid="button-exit-preview"
          >
            <X className="w-3 h-3" />
            Exit
          </button>
        </div>
      </div>

      {/* Content pushed below the banner */}
      <div className="pt-10">
        {done ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Preview Complete</h2>
              <p className="text-zinc-400 max-w-sm">
                You've reached the end of the onboarding flow. No data was saved.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRestart}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 gap-2"
                data-testid="button-preview-restart"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Flow
              </Button>
              <Button
                onClick={() => navigate("/admin")}
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold gap-2"
                data-testid="button-preview-back-admin"
              >
                Back to Admin
              </Button>
            </div>
          </div>
        ) : (
          <OnboardingWizard
            key={key}
            previewMode={true}
            onComplete={() => setDone(true)}
          />
        )}
      </div>
    </div>
  );
}
