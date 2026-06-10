import { createFormalStay } from "@/lib/stays/create-formal-stay";
import { StayError } from "@/lib/stays/errors";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface ConsolidateStaysInput {
  ephemeralStayToken: string;
  formalStayId?: string;
  venueId: string;
  createdByProfileId: string | null;
}

export interface ConsolidateStaysResult {
  formalStayId: string;
  consolidatedRecords: {
    feedbacks: number;
    incidents: number;
  };
  ephemeralStatus: "consolidated";
}

interface EphemeralStayRow {
  id: string;
  venue_id: string;
  stay_type: string;
  status: string;
  expires_at: string;
  consolidated_into: string | null;
}

async function countRecords(
  table: "feedback_entries" | "incident_reports",
  stayId: string,
): Promise<number> {
  const insforge = createInsforgeServerClient();
  const { count, error } = await insforge.database
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("guest_stay_id", stayId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function lazyExpireStay(stayId: string): Promise<void> {
  const insforge = createInsforgeServerClient();
  await insforge.database
    .from("guest_stays")
    .update({ status: "expired" })
    .eq("id", stayId)
    .eq("status", "active");
}

async function fetchEphemeralStay(
  stayToken: string,
  venueId: string,
): Promise<EphemeralStayRow> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .select(
      "id, venue_id, stay_type, status, expires_at, consolidated_into",
    )
    .eq("stay_token", stayToken)
    .maybeSingle();

  if (error || !data) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  const row = data as EphemeralStayRow;

  if (row.venue_id !== venueId) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  if (row.stay_type !== "ephemeral") {
    throw new StayError(
      "STAY_NOT_EPHEMERAL",
      "Solo se pueden consolidar estadías efímeras",
      400,
    );
  }

  if (row.status === "active") {
    const expiresAt = new Date(row.expires_at);
    if (expiresAt <= new Date()) {
      await lazyExpireStay(row.id);
      row.status = "expired";
    }
  }

  return row;
}

async function validateFormalStay(
  formalStayId: string,
  venueId: string,
): Promise<void> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .select("id, venue_id, stay_type, status")
    .eq("id", formalStayId)
    .maybeSingle();

  if (error || !data) {
    throw new StayError("STAY_NOT_FOUND", "Estadía formal no encontrada", 404);
  }

  if (data.venue_id !== venueId) {
    throw new StayError("STAY_NOT_FOUND", "Estadía formal no encontrada", 404);
  }

  if (data.stay_type !== "formal") {
    throw new StayError(
      "STAY_NOT_FORMAL",
      "La estadía destino debe ser formal",
      400,
    );
  }

  if (data.status !== "active") {
    throw new StayError(
      "STAY_NOT_ACTIVE",
      `No se puede consolidar en una estadía formal con estado ${data.status}`,
      409,
    );
  }
}

async function resolveFormalStayId(
  input: ConsolidateStaysInput,
): Promise<string> {
  if (input.formalStayId) {
    await validateFormalStay(input.formalStayId, input.venueId);
    return input.formalStayId;
  }

  const formal = await createFormalStay({
    venueId: input.venueId,
    createdByProfileId: input.createdByProfileId,
  });

  return formal.id;
}

async function moveRecordsToFormal(
  ephemeralStayId: string,
  formalStayId: string,
): Promise<{ feedbacks: number; incidents: number }> {
  const [feedbacks, incidents] = await Promise.all([
    countRecords("feedback_entries", ephemeralStayId),
    countRecords("incident_reports", ephemeralStayId),
  ]);

  const insforge = createInsforgeServerClient();

  const { error: feedbackError } = await insforge.database
    .from("feedback_entries")
    .update({ guest_stay_id: formalStayId })
    .eq("guest_stay_id", ephemeralStayId);

  if (feedbackError) {
    throw new Error(
      feedbackError.message ?? "Error al mover feedbacks a estadía formal",
    );
  }

  const { error: incidentError } = await insforge.database
    .from("incident_reports")
    .update({ guest_stay_id: formalStayId })
    .eq("guest_stay_id", ephemeralStayId);

  if (incidentError) {
    throw new Error(
      incidentError.message ?? "Error al mover incidencias a estadía formal",
    );
  }

  const { error: sessionError } = await insforge.database
    .from("staff_capture_sessions")
    .update({ guest_stay_id: formalStayId })
    .eq("guest_stay_id", ephemeralStayId);

  if (sessionError) {
    throw new Error(
      sessionError.message ??
        "Error al mover sesiones de captura a estadía formal",
    );
  }

  return { feedbacks, incidents };
}

async function markEphemeralConsolidated(
  ephemeralStayId: string,
  formalStayId: string,
): Promise<boolean> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .update({
      status: "consolidated",
      consolidated_into: formalStayId,
    })
    .eq("id", ephemeralStayId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ?? "Error al marcar estadía efímera como consolidada",
    );
  }

  return Boolean(data);
}

/**
 * Merges an ephemeral guest stay into a formal stay (reception consolidation).
 * Idempotent when the ephemeral stay was already consolidated.
 */
export async function consolidateStays(
  input: ConsolidateStaysInput,
): Promise<ConsolidateStaysResult> {
  const ephemeral = await fetchEphemeralStay(
    input.ephemeralStayToken,
    input.venueId,
  );

  if (ephemeral.status === "consolidated") {
    const formalStayId = ephemeral.consolidated_into;

    if (!formalStayId) {
      throw new StayError(
        "CONSOLIDATION_INVALID",
        "Estadía efímera consolidada sin destino formal",
        409,
      );
    }

    if (input.formalStayId && input.formalStayId !== formalStayId) {
      throw new StayError(
        "CONSOLIDATION_CONFLICT",
        "La estadía efímera ya fue consolidada en otra estadía formal",
        409,
      );
    }

    const [feedbacks, incidents] = await Promise.all([
      countRecords("feedback_entries", formalStayId),
      countRecords("incident_reports", formalStayId),
    ]);

    return {
      formalStayId,
      consolidatedRecords: { feedbacks, incidents },
      ephemeralStatus: "consolidated",
    };
  }

  if (ephemeral.status === "expired") {
    throw new StayError(
      "STAY_EXPIRED",
      "No se puede consolidar una estadía efímera expirada",
      409,
    );
  }

  if (ephemeral.status !== "active") {
    throw new StayError(
      "STAY_NOT_ACTIVE",
      `No se puede consolidar una estadía efímera con estado ${ephemeral.status}`,
      409,
    );
  }

  const formalStayId = await resolveFormalStayId(input);
  const consolidatedRecords = await moveRecordsToFormal(
    ephemeral.id,
    formalStayId,
  );

  const marked = await markEphemeralConsolidated(ephemeral.id, formalStayId);

  if (!marked) {
    const refreshed = await fetchEphemeralStay(
      input.ephemeralStayToken,
      input.venueId,
    );

    if (refreshed.status === "consolidated" && refreshed.consolidated_into) {
      if (
        input.formalStayId &&
        input.formalStayId !== refreshed.consolidated_into
      ) {
        throw new StayError(
          "CONSOLIDATION_CONFLICT",
          "La estadía efímera ya fue consolidada en otra estadía formal",
          409,
        );
      }

      const [feedbacks, incidents] = await Promise.all([
        countRecords("feedback_entries", refreshed.consolidated_into),
        countRecords("incident_reports", refreshed.consolidated_into),
      ]);

      return {
        formalStayId: refreshed.consolidated_into,
        consolidatedRecords: { feedbacks, incidents },
        ephemeralStatus: "consolidated",
      };
    }

    throw new StayError(
      "STAY_NOT_ACTIVE",
      "No se pudo consolidar la estadía efímera",
      409,
    );
  }

  return {
    formalStayId,
    consolidatedRecords,
    ephemeralStatus: "consolidated",
  };
}