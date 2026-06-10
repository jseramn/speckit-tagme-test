import { describe, expect, it } from "vitest";
import { detectAtypicalRooms } from "@/lib/executive/queries";

describe("detectAtypicalRooms (T073)", () => {
  it("flags rooms with >3× venue average AVEX sessions", () => {
    const rooms = [
      ...["101", "102", "103", "104", "105"].map((roomNumber) => ({
        roomNumber,
        sessionCount: 1,
        tagId: null,
      })),
      { roomNumber: "412", sessionCount: 20, tagId: "t2" },
    ];

    const atypical = detectAtypicalRooms(rooms);
    expect(atypical).toHaveLength(1);
    expect(atypical[0]?.roomNumber).toBe("412");
    expect(atypical[0]?.label).toBe("Habitación 412");
    expect(atypical[0]?.multiplier).toBeGreaterThan(3);
  });

  it("returns empty when no room exceeds threshold", () => {
    const rooms = [
      { roomNumber: "101", sessionCount: 4, tagId: null },
      { roomNumber: "102", sessionCount: 5, tagId: null },
    ];
    expect(detectAtypicalRooms(rooms)).toHaveLength(0);
  });

  it("excludes guest PII — only room number and counts", () => {
    const atypical = detectAtypicalRooms([
      ...["101", "102", "103"].map((roomNumber) => ({
        roomNumber,
        sessionCount: 1,
        tagId: null,
      })),
      { roomNumber: "412", sessionCount: 30, tagId: "tag-uuid" },
    ]);
    const row = atypical[0];
    expect(row).toBeDefined();
    expect(Object.keys(row!)).toEqual([
      "roomNumber",
      "label",
      "sessionCount",
      "venueAvg",
      "multiplier",
      "tagId",
    ]);
  });
});