"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout, renewSession } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const TIMEOUT_MS  = 8 * 60 * 60 * 1000; // 8 hours inactivity → auto logout
const WARNING_MS  = 2 * 60 * 1000;       // warn 2 minutes before expiry
const POLL_MS     = 5 * 60 * 1000;       // check server session validity every 5 minutes

export function SessionTimeout() {
  const router        = useRouter();
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARNING_MS / 1000);

  const doLogout = useCallback(async () => {
    setShowWarning(false);
    await logout();
  }, []);

  const resetTimers = useCallback(() => {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    setCountdown(WARNING_MS / 1000);

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    timerRef.current = setTimeout(doLogout, TIMEOUT_MS);
  }, [doLogout]);

  // Activity listeners — reset timer on any user interaction
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimers));
      if (timerRef.current)     clearTimeout(timerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers]);

  // Poll server every 5 minutes — if session is invalid, redirect immediately
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.status === 401) {
          console.log('[Session] Server returned 401 — redirecting to login');
          router.push('/login');
        }
      } catch {
        // network error — don't redirect, may be temporary
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [router]);

  const handleContinue = useCallback(async () => {
    await renewSession(); // re-issue JWT server-side
    resetTimers();
  }, [resetTimers]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-[#0F4C5C] text-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-400/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Sessão expirará em breve</p>
            <p className="text-xs text-[#A0E9FF]/80 mt-0.5">
              Sua sessão será encerrada em{" "}
              <strong className="text-orange-300">
                {mins > 0 ? `${mins}m ` : ""}{secs.toString().padStart(2, "0")}s
              </strong>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleContinue}
            className="flex-1 h-9 bg-[#A0E9FF] hover:bg-[#8de0f7] text-[#0F4C5C] font-black text-xs uppercase tracking-widest rounded-xl"
          >
            Continuar
          </Button>
          <Button
            onClick={doLogout}
            variant="ghost"
            className="h-9 px-3 text-[#A0E9FF]/60 hover:text-white hover:bg-white/10 text-xs font-bold rounded-xl"
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
