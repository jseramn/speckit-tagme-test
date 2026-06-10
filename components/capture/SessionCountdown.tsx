"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StaffSessionPollResponse } from "@/lib/validators/staff-session";

const POLL_INTERVAL_MS = 5000;

const EXPIRED_MESSAGE =
  "La sesión expiró. Pide al personal que acerque su tarjeta nuevamente.";

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function secondsUntil(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
}

export interface SessionCountdownProps {
  sessionToken: string;
  initialExpiresAt: string;
  onExpired: () => void;
}

export function SessionCountdown({
  sessionToken,
  initialExpiresAt,
  onExpired,
}: SessionCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    secondsUntil(initialExpiresAt),
  );
  const [expired, setExpired] = useState(secondsUntil(initialExpiresAt) <= 0);
  const expiredNotified = useRef(false);

  const notifyExpired = useCallback(() => {
    if (expiredNotified.current) return;
    expiredNotified.current = true;
    setExpired(true);
    setSecondsRemaining(0);
    onExpired();
  }, [onExpired]);

  useEffect(() => {
    if (secondsUntil(initialExpiresAt) <= 0) {
      notifyExpired();
    }
  }, [initialExpiresAt, notifyExpired]);

  useEffect(() => {
    let cancelled = false;

    async function pollSession() {
      try {
        const response = await fetch(`/api/staff/sessions/${sessionToken}`, {
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.status === 410) {
          notifyExpired();
          return;
        }

        if (!response.ok) return;

        const data = (await response.json()) as StaffSessionPollResponse;

        if (data.status === "expired") {
          notifyExpired();
          return;
        }

        setSecondsRemaining(data.secondsRemaining);
        if (data.secondsRemaining <= 0) {
          notifyExpired();
        } else {
          setExpired(false);
        }
      } catch {
        // Keep local countdown on transient network errors.
      }
    }

    const tick = () => {
      setSecondsRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          notifyExpired();
        }
        return next;
      });
    };

    const pollId = window.setInterval(pollSession, POLL_INTERVAL_MS);
    const tickId = window.setInterval(tick, 1000);

    void pollSession();

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [sessionToken, notifyExpired]);

  if (expired) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
      >
        {EXPIRED_MESSAGE}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-tagme-slate/10 bg-white/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-tagme-slate/60">
        Tiempo restante
      </p>
      <p
        className="font-mono text-lg font-semibold tabular-nums text-tagme-ink"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatCountdown(secondsRemaining)}
      </p>
    </div>
  );
}