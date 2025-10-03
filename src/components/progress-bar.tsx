"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CleaningType } from "@/lib/schemas";

const ALERT_THRESHOLD = 0.8;

interface ProgressBarProps {
  startTime: Date;
  cleaningType: CleaningType;
  cleaningTimeMinutes: number;
}

export function ProgressBar({ startTime, cleaningType, cleaningTimeMinutes }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const totalTime = cleaningTimeMinutes * 60 * 1000; // in milliseconds
      if (totalTime <= 0) {
        setProgress(0);
        return;
      }
      const elapsed = Date.now() - new Date(startTime).getTime();
      const calculatedProgress = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(calculatedProgress);
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // update every minute

    return () => clearInterval(interval);
  }, [startTime, cleaningTimeMinutes]);

  const isAlert = progress > ALERT_THRESHOLD * 100;

  return (
    <Progress
      value={progress}
      className={cn("h-2", isAlert && "[&>div]:bg-destructive")}
    />
  );
}