import { StayError } from "@/lib/stays/errors";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface CloseGuestStayResult {
  stayId: string;
  status: "closed";
  closedAt: string;
}

/**
 * Closes an active guest stay (checkout manual).
 */
export async function closeGuestStay(
  stayId: string,
  venueId: string,
): Promise<CloseGuestStayResult> {
  const insforge = createInsforgeServerClient();

  const { data: stay, error: fetchError } = await insforge.database
    .from("guest_stays")
    .select("id, venue_id, status")
    .eq("id", stayId)
    .maybeSingle();

  if (fetchError || !stay) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  if (stay.venue_id !== venueId) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  if (stay.status === "closed") {
    const { data: closed } = await insforge.database
      .from("guest_stays")
      .select("closed_at")
      .eq("id", stayId)
      .maybeSingle();

    return {
      stayId,
      status: "closed",
      closedAt: (closed?.closed_at as string) ?? new Date().toISOString(),
    };
  }

  if (stay.status !== "active") {
    throw new StayError(
      "STAY_NOT_ACTIVE",
      `No se puede cerrar una estadía con estado ${stay.status}`,
      409,
    );
  }

  const closedAt = new Date().toISOString();

  const { error: updateError } = await insforge.database
    .from("guest_stays")
    .update({
      status: "closed",
      closed_at: closedAt,
    })
    .eq("id", stayId)
    .eq("status", "active");

  if (updateError) {
    throw new Error(updateError.message ?? "Error al cerrar estadía");
  }

  return { stayId, status: "closed", closedAt };
}