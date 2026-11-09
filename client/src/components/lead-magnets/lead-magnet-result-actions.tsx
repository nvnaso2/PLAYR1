import { RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DrillLibraryAppIcon } from "@/components/drill-library-app-icon";

export function LeadMagnetResultActions({ onRetake }: { onRetake: () => void }) {
  return (
    <div className="lm-result-actions" aria-label="Insight actions">
      <Link href="/drills" className="lm-result-library-button" aria-label="Open Drill Library" title="Drill Library">
        <DrillLibraryAppIcon className="h-10 w-10" />
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetake}
        className="lm-result-retake-button"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Retake quiz
      </Button>
    </div>
  );
}
