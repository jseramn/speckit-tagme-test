import type { AvexDerivationThresholdConfig } from "@/types/executive";
import type { AlertCandidate } from "../types";

export interface AvexDerivationInput {
  sessionCount: number;
  escalatedCount: number;
  config: AvexDerivationThresholdConfig;
}

/**
 * CL-04: AVEX derivation spike in rolling window.
 */
export function evaluateAvexDerivation(
  input: AvexDerivationInput,
): AlertCandidate[] {
  const { sessionCount, escalatedCount, config } = input;

  if (sessionCount === 0) return [];

  const derivationPct = (escalatedCount / sessionCount) * 100;
  let severity: "attention" | "critical" | null = null;

  if (
    derivationPct >= config.critical_pct &&
    sessionCount >= config.min_sessions_critical
  ) {
    severity = "critical";
  } else if (
    derivationPct >= config.attention_pct &&
    sessionCount >= config.min_sessions_attention
  ) {
    severity = "attention";
  }

  if (!severity) return [];

  return [
    {
      dbAlertType: "avex_derivation",
      apiAlertType: "avex_derivation",
      severity,
      department: "front_office",
      entityRef: "avex",
      message: `Derivación AVEX elevada: ${derivationPct.toFixed(1)}% (${escalatedCount}/${sessionCount} sesiones)`,
      suggestedAction:
        severity === "critical"
          ? "Desplegar agente adicional en recepción y revisar temas recurrentes en KB."
          : "Monitorear cola AVEX y preparar refuerzo en recepción si persiste.",
      requiresBaseline: false,
    },
  ];
}