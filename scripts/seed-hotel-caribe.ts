#!/usr/bin/env tsx
/**
 * TagMe MVP — Seed piloto Hotel Caribe (T014 + T007–T010 executive)
 * Spec: specs/001-tagme-platform/data-model.md
 *       specs/002-clevel/spec.md (CL-02/03/04/08, CL-10/11)
 *
 * Idempotent: safe to re-run; updates venue/tags/KB and skips metrics if already seeded.
 *
 * Usage:
 *   npm run seed
 *   npx tsx scripts/seed-hotel-caribe.ts
 *
 * Requires: INSFORGE_URL, INSFORGE_SERVICE_KEY in .env.local or environment
 *
 * Demo executive credentials (local/dev only — do NOT use in production):
 *   Password: set EXECUTIVE_DEMO_PASSWORD in .env.local, or default "TagMe-Caribe-Demo-2026!"
 *
 *   | Email                          | Rol             | Scope        | Login hint        |
 *   |--------------------------------|-----------------|--------------|-------------------|
 *   | gg@hotel-caribe.demo           | executive       | —            | Gerente General   |
 *   | ops-manager@hotel-caribe.demo  | manager         | operations   | Gerente Operac.   |
 *   | fnb-manager@hotel-caribe.demo  | manager         | fnb          | Gerente F&B       |
 *   | experience-manager@...         | manager         | experience   | Gerente Experiencia |
 *   | front-office@hotel-caribe.demo | department_head | front_office | Jefe Recepción  |
 *
 * Production pilot users (T088): create in InsForge Auth console — NOT in this seed.
 * See specs/002-clevel/quickstart.md § "Usuarios reales del piloto".
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function loadEnvFile(filename: string): void {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) return;

  const content = readFileSync(filepath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local or export before running seed.`,
    );
  }
  return value;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ---------------------------------------------------------------------------
// Constants — Hotel Caribe pilot (simulated but realistic)
// ---------------------------------------------------------------------------

const VENUE_SLUG = "hotel-caribe";
const SEED_FINGERPRINT_PREFIX = "seed-m0-hotel-caribe";

const VENUE = {
  slug: VENUE_SLUG,
  name: "Hotel Caribe by Faranda Grand",
  brand: "Faranda Grand",
  timezone: "America/Bogota",
  is_pilot: true,
  contact_info: {
    phone: "+57 605 664 9494",
    whatsapp: "+57 300 123 4567",
    reception_hours: "Recepción 24 horas",
    address: "Cra. 1 #2-87, Centro Histórico, Cartagena de Indias, Bolívar",
    email: "reservas@hotelcaribe.com",
    website: "https://www.farandahotels.com/hotel-caribe",
    check_in: "15:00",
    check_out: "12:00",
    stars: 5,
    description:
      "Icono histórico frente a las murallas de Cartagena, con piscina, spa y gastronomía caribeña.",
  },
};

const DESTINATIONS = [
  {
    id: "menu",
    type: "menu" as const,
    label: "Menú Digital",
    url: "https://www.farandahotels.com/hotel-caribe/gastronomia",
    icon: "utensils",
    is_primary: true,
  },
  {
    id: "spa",
    type: "info" as const,
    label: "Spa & Bienestar",
    url: "https://www.farandahotels.com/hotel-caribe/spa",
    icon: "sparkles",
  },
  {
    id: "google",
    type: "external" as const,
    label: "Google",
    url: "https://g.page/hotel-caribe-cartagena",
    icon: "map-pin",
  },
  {
    id: "tripadvisor",
    type: "external" as const,
    label: "TripAdvisor",
    url: "https://www.tripadvisor.com/Hotel_Review-g297476-d302174-Reviews-Hotel_Caribe-Cartagena_Cartagena_District_Bolivar_Department.html",
    icon: "star",
  },
  {
    id: "instagram",
    type: "social" as const,
    label: "Instagram",
    url: "https://www.instagram.com/hotelcaribecartagena",
    icon: "instagram",
  },
  {
    id: "reservations",
    type: "reservation_link" as const,
    label: "Reservar",
    url: "https://www.farandahotels.com/hotel-caribe/reservar",
    icon: "calendar",
  },
];

const PUBLIC_EXPERIENCE = {
  title: "Hotel Caribe by Faranda Grand",
  welcome_message:
    "Bienvenido a Hotel Caribe. Toque para explorar servicios, menú y su asistente AVEX.",
  avex_enabled: true,
  destinations: DESTINATIONS,
};

const ROOM_DESTINATIONS = [
  {
    id: "room-service",
    type: "info" as const,
    label: "Servicio a la habitación",
    url: "tel:+576056649494",
    icon: "bell",
    is_primary: true,
  },
  {
    id: "menu",
    type: "menu" as const,
    label: "Menú Room Service",
    url: "https://www.farandahotels.com/hotel-caribe/gastronomia",
    icon: "utensils",
  },
  {
    id: "laundry",
    type: "info" as const,
    label: "Lavandería y planchado",
    url: "https://www.farandahotels.com/hotel-caribe/servicios",
    icon: "laundry",
  },
  {
    id: "spa",
    type: "info" as const,
    label: "Spa & Bienestar",
    url: "https://www.farandahotels.com/hotel-caribe/spa",
    icon: "sparkles",
  },
  {
    id: "reception",
    type: "external" as const,
    label: "Contactar recepción",
    url: "https://wa.me/573001234567",
    icon: "external",
  },
];

const ROOM_EXPERIENCE = {
  title: "Su habitación",
  welcome_message:
    "Todo lo que necesita durante su estancia está a un toque: room service 24 horas, " +
    "amenidades y asistencia de recepción.",
  avex_enabled: true,
  destinations: ROOM_DESTINATIONS,
};

type Zone = "lobby" | "room" | "restaurant" | "bar" | "other";

interface ExperienceSeed {
  title: string;
  welcome_message: string;
  avex_enabled: boolean;
  destinations: Array<{
    id: string;
    type: "menu" | "external" | "reservation_link" | "info" | "social";
    label: string;
    url: string;
    icon: string;
    is_primary?: boolean;
  }>;
}

/** Zone-specific hub copy (M4 — personalized welcome per zone). */
const EXPERIENCE_BY_ZONE: Record<Zone, ExperienceSeed> = {
  lobby: {
    ...PUBLIC_EXPERIENCE,
    welcome_message:
      "Bienvenido al lobby. Explore servicios del hotel, menú y su asistente AVEX.",
  },
  restaurant: {
    ...PUBLIC_EXPERIENCE,
    title: "Restaurante El Patio",
    welcome_message:
      "Bienvenido a El Patio. Consulte el menú, horarios y reservas.",
  },
  bar: {
    ...PUBLIC_EXPERIENCE,
    title: "Bar La Piscina",
    welcome_message:
      "Bienvenido al bar. Happy hour, carta de cócteles y piscina.",
  },
  other: {
    ...PUBLIC_EXPERIENCE,
    title: "Spa & Servicios",
    welcome_message:
      "Bienvenido. Descubra servicios y experiencias del hotel.",
  },
  room: ROOM_EXPERIENCE,
};

const NFC_TAGS: Array<{
  slug: string;
  label: string;
  zone: Zone;
  room_number: string | null;
}> = [
  { slug: "caribe-lobby", label: "Lobby principal", zone: "lobby", room_number: null },
  { slug: "caribe-restaurant", label: "Restaurante El Patio", zone: "restaurant", room_number: null },
  { slug: "caribe-bar-piscina", label: "Bar La Piscina", zone: "bar", room_number: null },
  { slug: "caribe-spa", label: "Spa Caribe", zone: "other", room_number: null },
  { slug: "caribe-room-205", label: "Habitación 205 — Vista jardín", zone: "room", room_number: "205" },
  { slug: "caribe-room-312", label: "Habitación 312 — Doble superior", zone: "room", room_number: "312" },
  { slug: "caribe-room-412", label: "Habitación 412 — Suite muralla", zone: "room", room_number: "412" },
  { slug: "caribe-room-508", label: "Habitación 508 — Vista mar", zone: "room", room_number: "508" },
  { slug: "caribe-room-601", label: "Habitación 601 — Penthouse", zone: "room", room_number: "601" },
];

const KNOWLEDGE_ENTRIES = [
  {
    category: "hours" as const,
    title: "Horario restaurante El Patio",
    content:
      "El restaurante El Patio abre todos los días de 6:30 a.m. a 10:30 p.m. " +
      "Desayuno buffet: 6:30–10:00 a.m. Almuerzo: 12:00–3:00 p.m. Cena: 6:30–10:00 p.m. " +
      "Domingos brunch especial 10:00 a.m.–2:00 p.m. (temporada alta).",
  },
  {
    category: "hours" as const,
    title: "Horario bar y piscina",
    content:
      "Bar La Piscina: 11:00 a.m.–11:00 p.m. (happy hour 5:00–7:00 p.m.). " +
      "Piscina principal: 7:00 a.m.–8:00 p.m. Toallas disponibles en el deck.",
  },
  {
    category: "hours" as const,
    title: "Horario spa",
    content:
      "Spa Caribe: martes a domingo 9:00 a.m.–7:00 p.m. (lunes cerrado por mantenimiento). " +
      "Reservas en recepción o ext. 450.",
  },
  {
    category: "room_service" as const,
    title: "Servicio a la habitación",
    content:
      "Room service 24 horas. Menú reducido 11:00 p.m.–6:00 a.m. " +
      "Pedidos por recepción (+57 605 664 9494) o WhatsApp. Entrega estimada 30–45 min.",
  },
  {
    category: "room_service" as const,
    title: "Lavandería y planchado",
    content:
      "Servicio de lavandería express (entrega mismo día si se entrega antes de 9:00 a.m.). " +
      "Planchado disponible 7:00 a.m.–9:00 p.m. Consulte tarifas en la guía de habitación.",
  },
  {
    category: "amenities" as const,
    title: "Amenidades de habitación",
    content:
      "Todas las habitaciones incluyen WiFi, aire acondicionado, caja fuerte, minibar y TV smart. " +
      "Suites cuentan con balcón y vista parcial a las murallas o al mar según categoría.",
  },
  {
    category: "amenities" as const,
    title: "Piscina, gimnasio y actividades",
    content:
      "Piscina climatizada, gimnasio 6:00 a.m.–9:00 p.m., clases de aqua-gym (sábados 9:00 a.m.). " +
      "Alquiler de bicicletas en recepción para recorridos por el Centro Histórico.",
  },
  {
    category: "policies" as const,
    title: "Política WiFi",
    content:
      "WiFi gratuito en todo el hotel. Red: HotelCaribe-Guest. " +
      "Contraseña en tarjeta de bienvenida o en recepción. Uso personal; sin streaming 4K en red pública.",
  },
  {
    category: "policies" as const,
    title: "Política de mascotas",
    content:
      "No se permiten mascotas, salvo animales de servicio con documentación previa. " +
      "Consulte con recepción al momento de la reserva.",
  },
  {
    category: "policies" as const,
    title: "Política de cancelación",
    content:
      "Cancelación gratuita hasta 48 horas antes del check-in. " +
      "Tarifas no reembolsables según condiciones de la reserva en farandahotels.com.",
  },
  {
    category: "faq" as const,
    title: "¿Dónde está el desayuno?",
    content:
      "El desayuno buffet se sirve en el restaurante El Patio, planta baja junto al lobby. " +
      "Incluido en tarifas con desayuno; otras tarifas pueden comprarlo en recepción.",
  },
  {
    category: "faq" as const,
    title: "¿Cómo llego al aeropuerto?",
    content:
      "Aeropuerto Rafael Núñez está a ~15 min en taxi (aprox. COP 25.000–35.000 según tráfico). " +
      "Recepción puede coordinar transfer privado con reserva de 24 h de anticipación.",
  },
  {
    category: "faq" as const,
    title: "Recomendaciones en Cartagena",
    content:
      "Cerca del hotel: murallas y torre del Reloj (5 min a pie), Getsemaní (10 min), " +
      "Castillo San Felipe (15 min en taxi). Para playas: Islas del Rosario con tour desde muelle.",
  },
  {
    category: "faq" as const,
    title: "¿Hay caja fuerte y cajero?",
    content:
      "Caja fuerte en cada habitación. Cajero automático en lobby. " +
      "Recepción puede guardar objetos de valor en bóveda bajo solicitud.",
  },
  {
    category: "faq" as const,
    title: "Contacto de emergencia y recepción",
    content:
      "Recepción 24 h: +57 605 664 9494. Emergencias médicas: coordinamos con clínica más cercana. " +
      "Bomberos/policía: 123. Para AVEX, también puede escalar a un agente humano en horario de recepción.",
  },
];

type DeviceType = "iphone" | "android" | "other";
type Channel = "nfc" | "url_direct" | "staff_assisted";
type DestType = "menu" | "external" | "reservation_link" | "info" | "social" | "avex";

interface SampleTouch {
  tagSlug: string;
  channel: Channel;
  device_type: DeviceType;
  country_code: string;
  daysAgo: number;
  hour: number;
  destinations: Array<{ type: DestType; url?: string }>;
}

const SAMPLE_TOUCHES: SampleTouch[] = [
  {
    tagSlug: "caribe-lobby",
    channel: "nfc",
    device_type: "iphone",
    country_code: "CO",
    daysAgo: 0,
    hour: 14,
    destinations: [{ type: "menu" }, { type: "external", url: DESTINATIONS[2].url }],
  },
  {
    tagSlug: "caribe-lobby",
    channel: "nfc",
    device_type: "android",
    country_code: "US",
    daysAgo: 1,
    hour: 10,
    destinations: [{ type: "menu" }],
  },
  {
    tagSlug: "caribe-restaurant",
    channel: "nfc",
    device_type: "iphone",
    country_code: "CO",
    daysAgo: 1,
    hour: 19,
    destinations: [{ type: "menu" }],
  },
  {
    tagSlug: "caribe-bar-piscina",
    channel: "url_direct",
    device_type: "android",
    country_code: "MX",
    daysAgo: 2,
    hour: 17,
    destinations: [{ type: "menu" }, { type: "social", url: DESTINATIONS[4].url }],
  },
  {
    tagSlug: "caribe-room-412",
    channel: "nfc",
    device_type: "iphone",
    country_code: "CO",
    daysAgo: 2,
    hour: 21,
    destinations: [{ type: "menu" }, { type: "avex" }],
  },
  {
    tagSlug: "caribe-room-205",
    channel: "nfc",
    device_type: "android",
    country_code: "ES",
    daysAgo: 3,
    hour: 9,
    destinations: [{ type: "menu" }, { type: "info", url: DESTINATIONS[1].url }],
  },
  {
    tagSlug: "caribe-room-508",
    channel: "nfc",
    device_type: "iphone",
    country_code: "CA",
    daysAgo: 4,
    hour: 11,
    destinations: [{ type: "avex" }],
  },
  {
    tagSlug: "caribe-room-312",
    channel: "staff_assisted",
    device_type: "other",
    country_code: "CO",
    daysAgo: 5,
    hour: 16,
    destinations: [{ type: "reservation_link", url: DESTINATIONS[5].url }],
  },
  {
    tagSlug: "caribe-spa",
    channel: "nfc",
    device_type: "iphone",
    country_code: "FR",
    daysAgo: 6,
    hour: 15,
    destinations: [{ type: "info", url: DESTINATIONS[1].url }],
  },
  {
    tagSlug: "caribe-room-601",
    channel: "nfc",
    device_type: "android",
    country_code: "BR",
    daysAgo: 7,
    hour: 20,
    destinations: [{ type: "menu" }, { type: "external", url: DESTINATIONS[3].url }],
  },
];

function touchTimestamp(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour + 5, Math.floor(Math.random() * 50), 0, 0); // rough Bogotá offset
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Executive layer — CL-02/03/04/08 (T007–T010)
// ---------------------------------------------------------------------------

const BOGOTA_OPERATING_HOURS = {
  start: "06:00",
  end: "23:00",
  timezone: "America/Bogota",
};

const ALERT_THRESHOLDS: Array<{
  alert_type: "activity_drop" | "tag_inactive" | "avex_derivation";
  department: string | null;
  config: Record<string, unknown>;
}> = [
  {
    alert_type: "activity_drop",
    department: null,
    config: {
      attention_drop_pct: 40,
      critical_drop_pct: 60,
      min_delta_touches_attention: 3,
      min_delta_touches_critical: 5,
      evaluation_window_min: 60,
      dedup_window_hours: 4,
      operating_hours: BOGOTA_OPERATING_HOURS,
    },
  },
  {
    alert_type: "tag_inactive",
    department: null,
    config: {
      inactive_hours: 24,
      min_venue_touches_per_day: 5,
      grace_hours: 72,
      operating_hours: BOGOTA_OPERATING_HOURS,
    },
  },
  {
    alert_type: "avex_derivation",
    department: "front_office",
    config: {
      attention_pct: 25,
      critical_pct: 40,
      window_hours: 1,
      min_sessions_attention: 4,
      min_sessions_critical: 6,
      dedup_window_hours: 4,
    },
  },
];

const KPI_TARGETS: Array<{
  department: string;
  kpi_key: string;
  weekly: number;
  monthly: number;
  comparison: "gte" | "lte";
}> = [
  {
    department: "executive",
    kpi_key: "total_interactions",
    weekly: 150,
    monthly: 700,
    comparison: "gte",
  },
  {
    department: "executive",
    kpi_key: "avex_resolution_rate",
    weekly: 75,
    monthly: 80,
    comparison: "gte",
  },
  {
    department: "front_office",
    kpi_key: "avex_derivation_rate",
    weekly: 25,
    monthly: 20,
    comparison: "lte",
  },
  {
    department: "front_office",
    kpi_key: "avex_sessions_per_day",
    weekly: 8,
    monthly: 10,
    comparison: "gte",
  },
  {
    department: "operations",
    kpi_key: "nfc_direct_rate",
    weekly: 70,
    monthly: 75,
    comparison: "gte",
  },
  {
    department: "operations",
    kpi_key: "abandonment_rate",
    weekly: 15,
    monthly: 12,
    comparison: "lte",
  },
  {
    department: "fnb",
    kpi_key: "menu_visit_pct",
    weekly: 50,
    monthly: 55,
    comparison: "gte",
  },
  {
    department: "experience",
    kpi_key: "destinations_per_touch",
    weekly: 1.2,
    monthly: 1.3,
    comparison: "gte",
  },
  {
    department: "transversal",
    kpi_key: "alert_action_rate",
    weekly: 80,
    monthly: 85,
    comparison: "gte",
  },
];

interface DemoExecutiveUser {
  email: string;
  displayName: string;
  role: "executive" | "manager" | "department_head";
  executiveScope:
    | "operations"
    | "front_office"
    | "fnb"
    | "experience"
    | null;
  loginHint: string;
}

const DEMO_EXECUTIVE_USERS: DemoExecutiveUser[] = [
  {
    email: "gg@hotel-caribe.demo",
    displayName: "Gerente General (demo)",
    role: "executive",
    executiveScope: null,
    loginHint: "Vista consolidada /executive/overview",
  },
  {
    email: "ops-manager@hotel-caribe.demo",
    displayName: "Gerente Operaciones (demo)",
    role: "manager",
    executiveScope: "operations",
    loginHint: "Dashboard operaciones /executive/operations",
  },
  {
    email: "fnb-manager@hotel-caribe.demo",
    displayName: "Gerente F&B (demo)",
    role: "manager",
    executiveScope: "fnb",
    loginHint: "Dashboard F&B /executive/fnb",
  },
  {
    email: "experience-manager@hotel-caribe.demo",
    displayName: "Gerente Experiencia (demo)",
    role: "manager",
    executiveScope: "experience",
    loginHint: "Dashboard experiencia /executive/experience",
  },
  {
    email: "front-office@hotel-caribe.demo",
    displayName: "Jefe Recepción (demo)",
    role: "department_head",
    executiveScope: "front_office",
    loginHint: "Dashboard front office /executive/front-office",
  },
];

function demoExecutivePassword(): string {
  return (
    process.env.EXECUTIVE_DEMO_PASSWORD?.trim() || "TagMe-Caribe-Demo-2026!"
  );
}

type InsforgeClient = Awaited<
  ReturnType<typeof import("@insforge/sdk")["createClient"]>
>;

async function upsertAlertThreshold(
  insforge: InsforgeClient,
  venueId: string,
  row: (typeof ALERT_THRESHOLDS)[number],
): Promise<void> {
  let query = insforge.database
    .from("alert_thresholds")
    .select("id")
    .eq("venue_id", venueId)
    .eq("alert_type", row.alert_type);

  if (row.department === null) {
    query = query.is("department", null);
  } else {
    query = query.eq("department", row.department);
  }

  const { data: existing, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    throw new Error(
      `Failed to lookup alert_threshold ${row.alert_type}: ${lookupError.message}`,
    );
  }

  const payload = {
    venue_id: venueId,
    alert_type: row.alert_type,
    department: row.department,
    config: row.config,
    is_active: true,
  };

  if (existing) {
    const { error } = await insforge.database
      .from("alert_thresholds")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(
        `Failed to update alert_threshold ${row.alert_type}: ${error.message}`,
      );
    }
    console.log(`✓ alert_threshold "${row.alert_type}" updated`);
  } else {
    const { error } = await insforge.database
      .from("alert_thresholds")
      .insert([payload]);

    if (error) {
      throw new Error(
        `Failed to insert alert_threshold ${row.alert_type}: ${error.message}`,
      );
    }
    console.log(`✓ alert_threshold "${row.alert_type}" created`);
  }
}

async function upsertKpiTarget(
  insforge: InsforgeClient,
  venueId: string,
  department: string,
  kpiKey: string,
  period: "weekly" | "monthly",
  targetValue: number,
  comparison: "gte" | "lte",
): Promise<void> {
  const { data: existing, error: lookupError } = await insforge.database
    .from("kpi_targets")
    .select("id")
    .eq("venue_id", venueId)
    .eq("department", department)
    .eq("kpi_key", kpiKey)
    .eq("period", period)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Failed to lookup kpi_target ${department}/${kpiKey}/${period}: ${lookupError.message}`,
    );
  }

  const payload = {
    venue_id: venueId,
    department,
    kpi_key: kpiKey,
    period,
    target_value: targetValue,
    comparison,
  };

  if (existing) {
    const { error } = await insforge.database
      .from("kpi_targets")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(
        `Failed to update kpi_target ${kpiKey}/${period}: ${error.message}`,
      );
    }
  } else {
    const { error } = await insforge.database
      .from("kpi_targets")
      .insert([payload]);

    if (error) {
      throw new Error(
        `Failed to insert kpi_target ${kpiKey}/${period}: ${error.message}`,
      );
    }
  }
}

async function upsertVenueBaseline(
  insforge: InsforgeClient,
  venueId: string,
): Promise<void> {
  const { data: existing, error: lookupError } = await insforge.database
    .from("venue_baseline")
    .select("venue_id, baseline_ready")
    .eq("venue_id", venueId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to lookup venue_baseline: ${lookupError.message}`);
  }

  const payload = {
    venue_id: venueId,
    first_touch_at: null,
    total_touches: 0,
    baseline_ready: false,
  };

  if (existing) {
    const { error } = await insforge.database
      .from("venue_baseline")
      .update(payload)
      .eq("venue_id", venueId);

    if (error) {
      throw new Error(`Failed to update venue_baseline: ${error.message}`);
    }
    console.log(`✓ venue_baseline updated (baseline_ready=false)`);
  } else {
    const { error } = await insforge.database
      .from("venue_baseline")
      .insert([payload]);

    if (error) {
      throw new Error(`Failed to insert venue_baseline: ${error.message}`);
    }
    console.log(`✓ venue_baseline created (baseline_ready=false)`);
  }
}

async function ensureDemoExecutiveUser(
  insforge: InsforgeClient,
  venueId: string,
  user: DemoExecutiveUser,
  password: string,
): Promise<void> {
  let authUserId: string | null = null;

  const { createAdminClient } = await import("@insforge/sdk");
  const admin = createAdminClient({
    baseUrl: requireEnv("INSFORGE_URL"),
    apiKey: requireEnv("INSFORGE_SERVICE_KEY"),
  });

  const { data: signInData } = await admin.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (signInData?.user?.id) {
    authUserId = signInData.user.id;
  } else {
    const { data: signUpData, error: signUpError } = await admin.auth.signUp({
      email: user.email,
      password,
      name: user.displayName,
    });

    if (signUpData?.user?.id) {
      authUserId = signUpData.user.id;
    } else if (signUpError) {
      const msg = signUpError.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("exist")) {
        const retry = await admin.auth.signInWithPassword({
          email: user.email,
          password,
        });
        authUserId = retry.data?.user?.id ?? null;
      }
      if (!authUserId) {
        console.warn(
          `⚠ Demo user ${user.email} no creado (${signUpError.message}). ` +
            "Use STAFF_DEV_EXECUTIVE_ROLE en desarrollo o cree el usuario en InsForge Auth.",
        );
        return;
      }
    }
  }

  if (!authUserId) {
    console.warn(
      `⚠ Demo user ${user.email} sin auth_user_id — omitiendo user_profile`,
    );
    return;
  }

  const { data: existingProfile, error: profileLookupError } =
    await insforge.database
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

  if (profileLookupError) {
    throw new Error(
      `Failed to lookup user_profile for ${user.email}: ${profileLookupError.message}`,
    );
  }

  const profilePayload = {
    auth_user_id: authUserId,
    venue_id: venueId,
    role: user.role,
    display_name: user.displayName,
    executive_scope: user.executiveScope,
  };

  if (existingProfile) {
    const { error } = await insforge.database
      .from("user_profiles")
      .update(profilePayload)
      .eq("id", existingProfile.id);

    if (error) {
      throw new Error(
        `Failed to update user_profile for ${user.email}: ${error.message}`,
      );
    }
    console.log(`✓ user_profile "${user.email}" updated (${user.role})`);
  } else {
    const { error } = await insforge.database
      .from("user_profiles")
      .insert([profilePayload]);

    if (error) {
      throw new Error(
        `Failed to insert user_profile for ${user.email}: ${error.message}`,
      );
    }
    console.log(`✓ user_profile "${user.email}" created (${user.role})`);
  }
}

// ---------------------------------------------------------------------------
// Seed logic (idempotent)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { createClient } = await import("@insforge/sdk");
  const insforge = createClient({
    baseUrl: requireEnv("INSFORGE_URL"),
    anonKey: requireEnv("INSFORGE_SERVICE_KEY"),
  });

  console.log("🌴 TagMe seed — Hotel Caribe pilot\n");

  // 1. Venue
  const { data: existingVenue, error: venueLookupError } = await insforge.database
    .from("venues")
    .select("id, slug")
    .eq("slug", VENUE_SLUG)
    .maybeSingle();

  if (venueLookupError) {
    throw new Error(`Failed to lookup venue: ${venueLookupError.message}`);
  }

  let venueId: string;

  if (existingVenue) {
    venueId = existingVenue.id;
    const { error } = await insforge.database
      .from("venues")
      .update({
        name: VENUE.name,
        brand: VENUE.brand,
        timezone: VENUE.timezone,
        contact_info: VENUE.contact_info,
        is_pilot: VENUE.is_pilot,
      })
      .eq("id", venueId);

    if (error) throw new Error(`Failed to update venue: ${error.message}`);
    console.log(`✓ Venue "${VENUE_SLUG}" updated (${venueId})`);
  } else {
    const { data: inserted, error } = await insforge.database
      .from("venues")
      .insert([VENUE])
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to insert venue: ${error?.message ?? "no data"}`);
    }
    venueId = inserted.id;
    console.log(`✓ Venue "${VENUE_SLUG}" created (${venueId})`);
  }

  // 2. Experience configs (public zones + room-specific M4)
  async function upsertExperienceConfig(
    lookupTitle: string,
    payload: ExperienceSeed,
  ): Promise<string> {
    const { data: existing, error: lookupError } = await insforge.database
      .from("experience_configs")
      .select("id")
      .eq("venue_id", venueId)
      .eq("title", lookupTitle)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Failed to lookup experience_config: ${lookupError.message}`);
    }

    if (existing) {
      const { error } = await insforge.database
        .from("experience_configs")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        throw new Error(`Failed to update experience_config: ${error.message}`);
      }
      console.log(`✓ Experience "${lookupTitle}" updated (${existing.id})`);
      return existing.id;
    }

    const { data: inserted, error } = await insforge.database
      .from("experience_configs")
      .insert([{ venue_id: venueId, ...payload }])
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(
        `Failed to insert experience_config: ${error?.message ?? "no data"}`,
      );
    }
    console.log(`✓ Experience "${lookupTitle}" created (${inserted.id})`);
    return inserted.id;
  }

  const experienceConfigIdByZone = new Map<Zone, string>();
  for (const zone of Object.keys(EXPERIENCE_BY_ZONE) as Zone[]) {
    const config = EXPERIENCE_BY_ZONE[zone];
    const id = await upsertExperienceConfig(config.title, config);
    experienceConfigIdByZone.set(zone, id);
  }

  // 3. NFC tags
  const tagIdBySlug = new Map<string, string>();

  for (const tag of NFC_TAGS) {
    const { data: existingTag, error: tagLookupError } = await insforge.database
      .from("nfc_tags")
      .select("id")
      .eq("slug", tag.slug)
      .maybeSingle();

    if (tagLookupError) {
      throw new Error(`Failed to lookup tag ${tag.slug}: ${tagLookupError.message}`);
    }

    const experienceConfigId =
      experienceConfigIdByZone.get(tag.zone) ?? experienceConfigIdByZone.get("lobby")!;

    const tagPayload = {
      venue_id: venueId,
      slug: tag.slug,
      label: tag.label,
      zone: tag.zone,
      room_number: tag.room_number,
      experience_config_id: experienceConfigId,
      is_active: true,
    };

    if (existingTag) {
      const { error } = await insforge.database
        .from("nfc_tags")
        .update(tagPayload)
        .eq("id", existingTag.id);

      if (error) throw new Error(`Failed to update tag ${tag.slug}: ${error.message}`);
      tagIdBySlug.set(tag.slug, existingTag.id);
      console.log(`✓ Tag "${tag.slug}" updated (${tag.zone})`);
    } else {
      const { data: inserted, error } = await insforge.database
        .from("nfc_tags")
        .insert([tagPayload])
        .select("id")
        .single();

      if (error || !inserted) {
        throw new Error(`Failed to insert tag ${tag.slug}: ${error?.message ?? "no data"}`);
      }
      tagIdBySlug.set(tag.slug, inserted.id);
      console.log(`✓ Tag "${tag.slug}" created (${tag.zone})`);
    }
  }

  // 4. Knowledge entries
  for (const entry of KNOWLEDGE_ENTRIES) {
    const { data: existingEntry, error: kbLookupError } = await insforge.database
      .from("knowledge_entries")
      .select("id")
      .eq("venue_id", venueId)
      .eq("title", entry.title)
      .maybeSingle();

    if (kbLookupError) {
      throw new Error(`Failed to lookup KB "${entry.title}": ${kbLookupError.message}`);
    }

    const kbPayload = {
      venue_id: venueId,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      is_active: true,
    };

    if (existingEntry) {
      const { error } = await insforge.database
        .from("knowledge_entries")
        .update(kbPayload)
        .eq("id", existingEntry.id);

      if (error) {
        throw new Error(`Failed to update KB "${entry.title}": ${error.message}`);
      }
      console.log(`✓ Knowledge "${entry.title}" updated (${entry.category})`);
    } else {
      const { error } = await insforge.database
        .from("knowledge_entries")
        .insert([kbPayload]);

      if (error) {
        throw new Error(`Failed to insert KB "${entry.title}": ${error.message}`);
      }
      console.log(`✓ Knowledge "${entry.title}" created (${entry.category})`);
    }
  }

  // 5. Sample TagMétricas events (idempotent via fingerprint prefix)
  const { data: existingSeedTouches, error: seedCheckError } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("venue_id", venueId)
    .like("client_fingerprint", `${SEED_FINGERPRINT_PREFIX}%`)
    .limit(1);

  if (seedCheckError) {
    throw new Error(`Failed to check seed touches: ${seedCheckError.message}`);
  }

  let touchCount = 0;
  let visitCount = 0;

  if (existingSeedTouches && existingSeedTouches.length > 0) {
    const { count, error: countError } = await insforge.database
      .from("touch_events")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .like("client_fingerprint", `${SEED_FINGERPRINT_PREFIX}%`);

    if (!countError && count != null) {
      touchCount = count;
    }
    console.log(`\n○ TagMétricas sample data already seeded (${touchCount} events) — skipped`);
  } else {
    console.log("\n→ Seeding TagMétricas sample events…");

    for (let i = 0; i < SAMPLE_TOUCHES.length; i++) {
      const sample = SAMPLE_TOUCHES[i];
      const tagId = tagIdBySlug.get(sample.tagSlug);
      if (!tagId) {
        throw new Error(`Tag not found for sample touch: ${sample.tagSlug}`);
      }

      const fingerprint = `${SEED_FINGERPRINT_PREFIX}-${i + 1}`;
      const createdAt = touchTimestamp(sample.daysAgo, sample.hour);

      const { data: touchRow, error: touchError } = await insforge.database
        .from("touch_events")
        .insert([
          {
            tag_id: tagId,
            venue_id: venueId,
            channel: sample.channel,
            device_type: sample.device_type,
            country_code: sample.country_code,
            client_fingerprint: fingerprint,
            deduplicated: false,
            created_at: createdAt,
          },
        ])
        .select("id")
        .single();

      if (touchError || !touchRow) {
        throw new Error(
          `Failed to insert touch for ${sample.tagSlug}: ${touchError?.message ?? "no data"}`,
        );
      }

      touchCount++;

      if (sample.destinations.length > 0) {
        const visits = sample.destinations.map((d) => ({
          touch_event_id: touchRow.id,
          destination_type: d.type,
          destination_url: d.url ?? null,
        }));

        const { error: visitError } = await insforge.database
          .from("destination_visits")
          .insert(visits);

        if (visitError) {
          throw new Error(
            `Failed to insert destination_visits for ${sample.tagSlug}: ${visitError.message}`,
          );
        }
        visitCount += visits.length;
      }
    }

    console.log(`✓ ${touchCount} touch_events + ${visitCount} destination_visits created`);
  }

  // 6. Executive alert thresholds (CL-02/03/04 + gracia 72h CL-10)
  console.log("\n→ Seeding executive alert_thresholds…");
  for (const threshold of ALERT_THRESHOLDS) {
    await upsertAlertThreshold(insforge, venueId, threshold);
  }

  // 7. KPI targets (CL-08 — 9 KPIs × weekly/monthly)
  console.log("\n→ Seeding executive kpi_targets…");
  for (const kpi of KPI_TARGETS) {
    await upsertKpiTarget(
      insforge,
      venueId,
      kpi.department,
      kpi.kpi_key,
      "weekly",
      kpi.weekly,
      kpi.comparison,
    );
    await upsertKpiTarget(
      insforge,
      venueId,
      kpi.department,
      kpi.kpi_key,
      "monthly",
      kpi.monthly,
      kpi.comparison,
    );
  }
  console.log(`✓ ${KPI_TARGETS.length * 2} kpi_targets upserted`);

  // 8. Venue baseline (CL-11 — calibración hasta 14 días + 100 toques)
  console.log("\n→ Seeding venue_baseline…");
  await upsertVenueBaseline(insforge, venueId);

  // 9. Demo executive auth users + profiles (T009)
  console.log("\n→ Seeding demo executive users…");
  const demoPassword = demoExecutivePassword();
  for (const user of DEMO_EXECUTIVE_USERS) {
    await ensureDemoExecutiveUser(insforge, venueId, user, demoPassword);
  }

  // 10. Verification summary
  const { data: tags, error: tagsError } = await insforge.database
    .from("nfc_tags")
    .select("slug, zone, is_active")
    .eq("venue_id", venueId)
    .eq("is_active", true);

  const { data: kbRows, error: kbError } = await insforge.database
    .from("knowledge_entries")
    .select("id")
    .eq("venue_id", venueId)
    .eq("is_active", true);

  const lobbyConfigId =
    experienceConfigIdByZone.get("lobby") ?? experienceConfigIdByZone.values().next().value;

  const { data: config, error: configError } = await insforge.database
    .from("experience_configs")
    .select("avex_enabled, destinations")
    .eq("id", lobbyConfigId ?? "")
    .single();

  const { count: totalTouches, error: touchesError } = await insforge.database
    .from("touch_events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  if (tagsError) {
    console.warn(`⚠ Could not verify tags: ${tagsError.message}`);
  } else {
    const destCount = Array.isArray(config?.destinations)
      ? config.destinations.length
      : 0;
    const kbCount = kbError ? "?" : (kbRows?.length ?? 0);
    const metricsCount = touchesError ? "?" : (totalTouches ?? 0);

    console.log(`\n✅ Seed complete — Hotel Caribe (${VENUE_SLUG})`);
    console.log(`   Tags activos: ${tags?.length ?? 0}`);
    console.log(`   KB entries: ${kbCount}`);
    console.log(`   Destinos hub: ${destCount}`);
    console.log(
      `   avex_enabled=${configError ? "?" : config?.avex_enabled} · touch_events=${metricsCount}`,
    );
    console.log("\n   Rutas NFC (M1):");
    for (const t of tags ?? []) {
      const room = t.zone === "room" ? ` · habitación` : "";
      console.log(`   • /t/${t.slug} (${t.zone}${room})`);
    }

    console.log("\n   Login gerencial (executive layer — M0):");
    console.log(
      "   Password: EXECUTIVE_DEMO_PASSWORD en .env.local o valor por defecto del script",
    );
    for (const user of DEMO_EXECUTIVE_USERS) {
      const scope = user.executiveScope ? ` · scope=${user.executiveScope}` : "";
      console.log(
        `   • ${user.email} → ${user.role}${scope} — ${user.loginHint}`,
      );
    }
    console.log("   URL: /login → redirige a /executive/overview tras auth");
  }
}

main().catch((err: unknown) => {
  console.error("\n❌ Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});