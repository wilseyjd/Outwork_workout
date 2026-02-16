import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, X } from "lucide-react";

interface RestTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  onDismiss: () => void;
}

export function RestTimer({ initialSeconds, onComplete, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (paused || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, remaining]);

  useEffect(() => {
    if (remaining === 0 && !completedRef.current) {
      completedRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      onComplete();
    }
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = remaining / initialSeconds;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground font-medium">Rest</span>
          <span className="font-mono text-2xl font-bold tabular-nums">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
