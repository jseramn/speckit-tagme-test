import type { TagSummary, TagZone } from "@/types";

/** AVEX-ready room context — passed through GuestHubPayload (M4, T065). */
export interface RoomContext {
  isRoom: boolean;
  zone: TagZone;
  roomNumber: string | null;
  displayLabel: string;
  welcomeHeadline: string | null;
}

export function isRoomTag(
  tag: Pick<TagSummary, "zone" | "roomNumber">,
): boolean {
  return tag.zone === "room" && Boolean(tag.roomNumber?.trim());
}

export function buildRoomDisplayLabel(roomNumber: string): string {
  return `Habitación ${roomNumber}`;
}

export function buildRoomWelcomeHeadline(roomNumber: string): string {
  return `Bienvenido a la habitación ${roomNumber}`;
}

export function resolveRoomContext(tag: TagSummary): RoomContext {
  const isRoom = isRoomTag(tag);
  const roomNumber = isRoom ? tag.roomNumber!.trim() : null;

  return {
    isRoom,
    zone: tag.zone,
    roomNumber,
    displayLabel:
      isRoom && roomNumber ? buildRoomDisplayLabel(roomNumber) : "",
    welcomeHeadline:
      isRoom && roomNumber ? buildRoomWelcomeHeadline(roomNumber) : null,
  };
}