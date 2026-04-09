import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrillTimerProps {
  value: number;
  onChange: (seconds: number) => void;
  className?: string;
  "data-testid"?: string;
}

function playBuzzer() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.28);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch {
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function DrillTimer({ value, onChange, className, "data-testid": testId }: DrillTimerProps) {
  const defaultSecs = value > 0 ? value : 30;
  const [targetSeconds, setTargetSeconds] = useState(defaultSecs);
  const [remaining, setRemaining] = useState(defaultSecs);
  const [editTarget, setEditTarget] = useState(String(defaultSecs));
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!syncedRef.current && value > 0) {
      syncedRef.current = true;
      setTargetSeconds(value);
      setRemaining(value);
      setEditTarget(String(value));
    }
  }, [value]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setIsDone(true);
            playBuzzer();
            onChange(targetSeconds);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, targetSeconds]);

  const progress = targetSeconds > 0 ? ((targetSeconds - remaining) / targetSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 26;

  const handleTargetChange = (val: string) => {
    setEditTarget(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      setTargetSeconds(n);
      setRemaining(n);
      onChange(n);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    setIsDone(false);
    setIsRunning(true);
  };

  const handlePauseResume = () => setIsRunning(r => !r);

  const handleReset = () => {
    setIsRunning(false);
    setIsDone(false);
    setHasStarted(false);
    setRemaining(targetSeconds);
  };

  if (!hasStarted) {
    return (
      <div className={cn("flex items-center gap-1.5", className)} data-testid={testId}>
        <div className="flex items-center gap-1 bg-muted rounded-md px-2 h-8">
          <Timer className="w-3.5 h-3.5 text-primary shrink-0" />
          <Input
            type="text"
            inputMode="numeric"
            value={editTarget}
            onChange={e => handleTargetChange(e.target.value)}
            className="w-10 h-6 border-0 bg-transparent p-0 text-center text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid={`${testId}-input`}
          />
          <span className="text-[11px] text-muted-foreground leading-none">s</span>
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-8 px-2 text-xs gap-1 shrink-0"
          onClick={handleStart}
          data-testid={`${testId}-start`}
        >
          <Play className="w-3 h-3" />
          Start
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1 py-0.5", className)} data-testid={testId}>
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
          <circle
            cx="30" cy="30" r="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted"
          />
          <circle
            cx="30" cy="30" r="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={isDone ? "text-green-500" : "text-primary"}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isDone ? (
            <span className="text-green-500 text-xl font-bold leading-none">✓</span>
          ) : (
            <span
              className={cn(
                "text-xs font-mono font-bold leading-none",
                remaining <= 5 && "text-orange-500 animate-pulse"
              )}
            >
              {formatTime(remaining)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isDone && (
          <Button
            size="sm"
            variant={isRunning ? "outline" : "default"}
            className="h-6 w-6 p-0"
            onClick={handlePauseResume}
            data-testid={`${testId}-pause`}
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={handleReset}
          data-testid={`${testId}-reset`}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
