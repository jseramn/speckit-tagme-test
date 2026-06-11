import { buildRoomContextSnapshot } from "@/lib/capture/build-room-context-snapshot";
import { CaptureError } from "@/lib/capture/errors";
import { resolveTag } from "@/lib/tags/resolve-tag";
import type { RoomContextSnapshot } from "@/lib/capture/build-room-context-snapshot";

export interface ResolvedRoomTagForSubmit {
  tagId: string;
  venueId: string;
  contextSnapshot: RoomContextSnapshot;
}

export async function resolveRoomTagForSubmit(
  roomTagSlug: string,
): Promise<ResolvedRoomTagForSubmit> {
  const payload = await resolveTag(roomTagSlug);

  if (!payload) {
    throw new CaptureError(
      "INVALID_ROOM_TAG",
      "Tag de habitación o zona no encontrado",
      404,
    );
  }

  return {
    tagId: payload.tag.id,
    venueId: payload.venue.id,
    contextSnapshot: buildRoomContextSnapshot(payload.tag),
  };
}