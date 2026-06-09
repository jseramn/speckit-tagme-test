"use client";

import { useEffect, useRef, useState } from "react";
import type { DestinationType, TouchChannel } from "@/types";

const TOUCH_API = "/api/events/touch";
const DESTINATION_API = "/api/events/destination";

function isStaffAssisted(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("assisted") === "1";
}

function touchApiUrl(): string {
  return isStaffAssisted() ? `${TOUCH_API}?assisted=1` : TOUCH_API;
}

/** Resolves analytics channel from URL context (M6 / US-5). */
export function resolveTouchChannel(): TouchChannel {
  if (isStaffAssisted()) return "staff_assisted";
  return "url_direct";
}

function buildFingerprint(): string {
  if (typeof window === "undefined") return "server";

  const parts = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  const raw = parts.join("|");

  try {
    return `fp:${btoa(raw).slice(0, 48)}`;
  } catch {
    return `fp:${raw.length}`;
  }
}

export interface TouchTrackPayload {
  tagSlug: string;
  channel?: TouchChannel;
  clientFingerprint?: string;
}

function buildPayload(payload: TouchTrackPayload) {
  return {
    tagSlug: payload.tagSlug,
    channel: payload.channel ?? "nfc",
    clientFingerprint: payload.clientFingerprint ?? buildFingerprint(),
  };
}

export interface TouchTrackResult {
  touchEventId: string | null;
  deduplicated: boolean;
}

/** Fire-and-forget touch registration via fetch. */
export async function trackTouch(
  payload: TouchTrackPayload,
): Promise<TouchTrackResult> {
  const body = buildPayload(payload);

  try {
    const response = await fetch(touchApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    if (!response.ok) {
      return { touchEventId: null, deduplicated: false };
    }

    const data = (await response.json()) as {
      touchEventId?: string;
      deduplicated?: boolean;
    };

    return {
      touchEventId: data.touchEventId ?? null,
      deduplicated: data.deduplicated ?? false,
    };
  } catch {
    return { touchEventId: null, deduplicated: false };
  }
}

export interface DestinationTrackPayload {
  touchEventId: string;
  destinationType: DestinationType | "avex";
  destinationUrl?: string;
}

/** Registers a destination visit before navigation. */
export async function trackDestination(
  payload: DestinationTrackPayload,
): Promise<boolean> {
  try {
    const response = await fetch(DESTINATION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touchEventId: payload.touchEventId,
        destinationType: payload.destinationType,
        destinationUrl: payload.destinationUrl,
      }),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** sendBeacon fallback for page unload (TR-03). */
export function sendBeaconTouch(payload: TouchTrackPayload): boolean {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }

  const body = buildPayload(payload);
  const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
  return navigator.sendBeacon(touchApiUrl(), blob);
}

export interface TouchTrackingState {
  touchEventId: string | null;
  isReady: boolean;
}

/**
 * Registers a touch event on mount and exposes touchEventId for destination tracking.
 */
export function useTouchTracking(
  tagSlug: string,
  channel: TouchChannel = "nfc",
): TouchTrackingState {
  const tracked = useRef(false);
  const fingerprint = useRef<string | null>(null);
  const [touchEventId, setTouchEventId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fingerprint.current = buildFingerprint();

    void trackTouch({
      tagSlug,
      channel,
      clientFingerprint: fingerprint.current,
    }).then((result) => {
      setTouchEventId(result.touchEventId);
      setIsReady(true);
    });

    const handlePageHide = () => {
      sendBeaconTouch({
        tagSlug,
        channel,
        clientFingerprint: fingerprint.current ?? undefined,
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [tagSlug, channel]);

  return { touchEventId, isReady };
}