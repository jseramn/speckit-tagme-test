import { describe, expect, it } from "vitest";
import {
  computeRoiFromCounts,
  excludeAvexOverlappingTouches,
} from "@/lib/executive/roi";

describe("executive-roi (CL-07)", () => {
  it("computes AVEX resolved sessions × 3.5 min (10 sessions, 3 escalated → 24.5)", () => {
    const result = computeRoiFromCounts({
      resolvedSessions: 7,
      selfServiceTouches: 0,
    });
    expect(result.staffMinutesSaved).toBe(24.5);
    expect(result.totalMinutes).toBe(24.5);
  });

  it("adds self-service NFC touches × 0.5 min as secondary", () => {
    const result = computeRoiFromCounts({
      resolvedSessions: 7,
      selfServiceTouches: 16,
    });
    expect(result.staffMinutesSaved).toBe(24.5);
    expect(result.selfServiceMinutes).toBe(8);
    expect(result.totalMinutes).toBe(32.5);
  });

  it("excludes NFC touches with AVEX session on same tag within 30 min", () => {
    const baseTime = "2026-06-09T12:00:00.000Z";
    const touches = [
      {
        id: "t1",
        tag_id: "tag-a",
        created_at: baseTime,
        channel: "nfc",
      },
      {
        id: "t2",
        tag_id: "tag-b",
        created_at: baseTime,
        channel: "nfc",
      },
    ];
    const sessions = [
      {
        id: "s1",
        tag_id: "tag-a",
        created_at: "2026-06-09T12:10:00.000Z",
      },
    ];

    const filtered = excludeAvexOverlappingTouches(touches, sessions);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("t2");
  });
});