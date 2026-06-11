import { describe, expect, it } from "vitest";
import { buildRoomContextSnapshot } from "@/lib/capture/build-room-context-snapshot";

describe("buildRoomContextSnapshot", () => {
  it("builds snapshot for room tag with room_number", () => {
    const snapshot = buildRoomContextSnapshot({
      id: "tag-412",
      slug: "caribe-room-412",
      label: "Habitación 412",
      zone: "room",
      roomNumber: "412",
    });

    expect(snapshot.origin_type).toBe("room_nfc");
    expect(snapshot.nfc_tag_id).toBe("tag-412");
    expect(snapshot.room_number).toBe("412");
    expect(snapshot.zone).toBe("room");
    expect(snapshot).not.toHaveProperty("staff_member_id");
  });

  it("builds snapshot for non-room zone without room_number", () => {
    const snapshot = buildRoomContextSnapshot({
      id: "tag-lobby",
      slug: "caribe-lobby",
      label: "Lobby principal",
      zone: "lobby",
      roomNumber: null,
    });

    expect(snapshot.origin_type).toBe("room_nfc");
    expect(snapshot.room_number).toBeNull();
    expect(snapshot.zone).toBe("lobby");
  });
});