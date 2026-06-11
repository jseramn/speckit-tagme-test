import type { IncidentStatus } from "@/types/staff";

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  abierta: ["en_progreso"],
  en_progreso: ["resuelta"],
  resuelta: ["cerrada"],
  cerrada: [],
};

export class IncidentTransitionError extends Error {
  constructor(
    public readonly code: "INVALID_TRANSITION",
    message: string,
  ) {
    super(message);
    this.name = "IncidentTransitionError";
  }
}

export function assertValidTransition(
  from: IncidentStatus,
  to: IncidentStatus,
): void {
  if (from === to) return;

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new IncidentTransitionError(
      "INVALID_TRANSITION",
      `Transición inválida: ${from} → ${to}`,
    );
  }
}

export type IncidentStatusFilter =
  | IncidentStatus
  | "open"
  | "abierta"
  | "en_progreso"
  | "resuelta"
  | "cerrada";

export function resolveStatusFilter(
  status: string | null | undefined,
): IncidentStatus[] | null {
  if (!status) return null;
  if (status === "open") return ["abierta", "en_progreso"];
  if (
    status === "abierta" ||
    status === "en_progreso" ||
    status === "resuelta" ||
    status === "cerrada"
  ) {
    return [status];
  }
  return null;
}

export function isTerminalStatus(status: IncidentStatus): boolean {
  return status === "cerrada";
}