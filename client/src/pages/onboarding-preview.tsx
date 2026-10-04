import { useState } from "react";
import { useLocation } from "wouter";
import AppOnboardingPage from "./app-onboarding";
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
      {/* Compact fixed preview banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-3 py-1.5 bg-orange-500/95 backdrop-blur shadow-lg">
        <div className="flex items-center gap-1.5 text-black/80">
          <Eye className="w-3 h-3 shrink-0" />
          <span className="text-[11px] font-bold">PREVIEW MODE</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/15 hover:bg-black/25 transition-colors"
            data-testid="button-restart-preview"
            title="Restart preview">
            <RotateCcw className="w-3 h-3 text-black/70" />
            <span className="text-[10px] font-bold text-black/70">Restart</span>
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/15 hover:bg-black/25 transition-colors"
            data-testid="button-exit-preview"
            title="Exit preview">
            <X className="w-3 h-3 text-black/70" />
            <span className="text-[10px] font-bold text-black/70">Exit</span>
          </button>
        </div>
      </div>

      {done ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-zinc-950 pt-9">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Preview Complete</h2>
            <p className="text-zinc-400 max-w-sm">You've seen the full onboarding flow. No data was saved.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRestart} variant="outline"
              className="border-zinc-700 hover:bg-zinc-800 gap-2" data-testid="button-preview-restart">
              <RotateCcw className="w-4 h-4" /> Restart
            </Button>
            <Button onClick={() => navigate("/admin")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2" data-testid="button-preview-back-admin">
              Back to Admin
            </Button>
          </div>
        </div>
      ) : (
        <AppOnboardingPage key={key} previewMode signupMode onComplete={() => setDone(true)} />
      )}
    </div>
  );
}
