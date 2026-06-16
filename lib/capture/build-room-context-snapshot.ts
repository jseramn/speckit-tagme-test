import type { TagSummary } from "@/types";

/** Immutable snapshot for room_nfc feedback/incident (Principio III). */
export interface RoomContextSnapshot {
  origin_type: "room_nfc";
  nfc_tag_id: string;
  tag_slug: string;
  tag_label: string;
  zone: TagSummary["zone"];
  room_number: string | null;
}

export function buildRoomContextSnapshot(tag: TagSummary): RoomContextSnapshot {
  const roomNumber =
    tag.zone === "room" && tag.roomNumber?.trim()
      ? tag.roomNumber.trim()
      : null;

  return {
    origin_type: "room_nfc",
    nfc_tag_id: tag.id,
    tag_slug: tag.slug,
    tag_label: tag.label,
    zone: tag.zone,
    room_number: roomNumber,
  };
}