import type { KpiCard } from "@/types/executive";

export interface KpiNarrative {
  label: string;
  definition: string;
  suggestedAction: string | null;
}

const KPI_NARRATIVES: Record<string, KpiNarrative> = {
  total_interactions: {
    label: "Interacciones totales",
    definition:
      "Toques NFC y accesos al hub en el período seleccionado",
    suggestedAction:
      "Si la adopción es baja, reforzar señalización en lobby y habitaciones",
  },
  avex_resolution_rate: {
    label: "Tasa resolución AVEX",
    definition:
      "Porcentaje de sesiones AVEX resueltas sin derivación a recepción",
    suggestedAction:
      "Revisar categorías de la base de conocimiento con más derivaciones",
  },
  avex_derivation_rate: {
    label: "Tasa derivación AVEX",
    definition:
      "Porcentaje de sesiones AVEX escaladas a personal humano",
    suggestedAction:
      "Actualizar KB de horarios restaurante y room service",
  },
  avex_sessions_per_day: {
    label: "Sesiones AVEX / día",
    definition: "Promedio diario de consultas al asistente virtual",
    suggestedAction:
      "Anticipar refuerzo en recepción si el volumen supera la capacidad",
  },
  nfc_direct_rate: {
    label: "Acceso NFC directo",
    definition: "Porcentaje de toques con canal NFC sin asistencia de staff",
    suggestedAction: "Reforzar señalización y capacitación en habitaciones",
  },
  abandonment_rate: {
    label: "Tasa de abandono",
    definition:
      "Porcentaje de toques sin visita a ningún destino del hub",
    suggestedAction:
      "Revisar relevancia del contenido y UX en zonas con alto abandono",
  },
  menu_visit_pct: {
    label: "% visitas a menú",
    definition:
      "Proporción de visitas a destinos de menú en tags restaurante/bar",
    suggestedAction:
      "Priorizar actualización de carta digital y promociones F&B",
  },
  destinations_per_touch: {
    label: "Destinos por toque",
    definition:
      "Promedio de destinos visitados por cada interacción con el hub",
    suggestedAction:
      "Evaluar si el hub ofrece rutas claras hacia la información clave",
  },
  alert_action_rate: {
    label: "Alertas con acción <24 h",
    definition:
      "Porcentaje de alertas gerenciales atendidas en menos de 24 horas",
    suggestedAction:
      "Asignar responsables por área para reducir tiempo de respuesta",
  },
};

export function getKpiNarrative(kpiKey: string): KpiNarrative {
  return (
    KPI_NARRATIVES[kpiKey] ?? {
      label: kpiKey,
      definition: "Indicador operativo del venue",
      suggestedAction: null,
    }
  );
}

export function enrichKpiWithNarrative(
  card: Omit<KpiCard, "label" | "definition" | "suggestedAction"> & {
    key: string;
  },
  options?: { forceAction?: boolean },
): KpiCard {
  const narrative = getKpiNarrative(card.key);
  const shouldSuggest =
    options?.forceAction ||
    (card.onTarget === false && card.deltaPct !== null);

  let suggestedAction: string | null = null;
  if (shouldSuggest && narrative.suggestedAction) {
    suggestedAction = narrative.suggestedAction;
  } else if (card.key === "avex_derivation_rate" && (card.value ?? 0) > 25) {
    suggestedAction = narrative.suggestedAction;
  } else if (card.key === "abandonment_rate" && (card.value ?? 0) > 15) {
    suggestedAction = narrative.suggestedAction;
  }

  return {
    ...card,
    label: narrative.label,
    definition: narrative.definition,
    suggestedAction,
  };
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  operations: "Operaciones",
  fnb: "F&B",
  experience: "Experiencia",
  front_office: "Recepción",
};