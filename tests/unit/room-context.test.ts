import { describe, expect, it } from "vitest";
import {
  buildRoomDisplayLabel,
  buildRoomWelcomeHeadline,
  isRoomTag,
  resolveRoomContext,
} from "@/lib/tags/room-context";

describe("room-context", () => {
  it("detects room tags with roomNumber", () => {
    expect(isRoomTag({ zone: "room", roomNumber: "412" })).toBe(true);
    expect(isRoomTag({ zone: "lobby", roomNumber: null })).toBe(false);
    expect(isRoomTag({ zone: "room", roomNumber: null })).toBe(false);
    expect(isRoomTag({ zone: "room", roomNumber: "  " })).toBe(false);
  });

  it("builds display labels and headlines", () => {
    expect(buildRoomDisplayLabel("412")).toBe("Habitación 412");
    expect(buildRoomWelcomeHeadline("412")).toBe(
      "Bienvenido a la habitación 412",
    );
  });

  it("resolves AVEX-ready room context", () => {
    const ctx = resolveRoomContext({
      id: "1",
      slug: "caribe-room-412",
      label: "Suite muralla",
      zone: "room",
      roomNumber: "412",
    });

    expect(ctx.isRoom).toBe(true);
    expect(ctx.roomNumber).toBe("412");
    expect(ctx.zone).toBe("room");
    expect(ctx.displayLabel).toBe("Habitación 412");
    expect(ctx.welcomeHeadline).toBe("Bienvenido a la habitación 412");
  });

  it("returns non-room context for public zones", () => {
    const ctx = resolveRoomContext({
      id: "2",
      slug: "caribe-lobby",
      label: "Lobby",
      zone: "lobby",
      roomNumber: null,
    });

    expect(ctx.isRoom).toBe(false);
    expect(ctx.welcomeHeadline).toBeNull();
    expect(ctx.displayLabel).toBe("");
  });
});