# Contract: Executive API (Gerencia)

**Versión**: 1.0 (M0–M6 completo) | **Auth**: InsForge JWT — roles `executive` | `manager` | `department_head`

Todas las rutas bajo `/(executive)` o `/api/executive/*` requieren sesión válida con rol gerencial. Staff Fase 1 (`staff`, `ops`) **no** tiene acceso (403).

Validación de respuestas: `lib/validators/executive.ts` (Zod).

---

## Auth

| Endpoint | Método | Roles | Descripción |
|----------|--------|-------|-------------|
| InsForge Auth | SDK | — | `signInWithPassword` |
| `/api/executive/me` | GET | executive, manager, department_head | Perfil + scope + baseline |

### GET `/api/executive/me`

Sin query params. Usa `venue_id` del perfil del usuario.

**Response 200**

```json
{
  "userId": "uuid",
  "role": "executive",
  "executiveScope": null,
  "venueId": "uuid",
  "venueName": "Hotel Caribe by Faranda Grand",
  "venueSlug": "hotel-caribe",
  "displayName": "Gerente General (demo)",
  "baselineReady": false,
  "baselineDay": 3,
  "totalTouches": 42,
  "firstTouchAt": "2026-06-01T14:30:00.000Z"
}
```

**Response 401** — sin sesión.

**Response 403** — rol `staff` / `ops`.

---

## Capa 1 — Pulso (M2)

### GET `/api/executive/pulse`

| Query | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| `venueId` | uuid | sí | — |
| `windowMin` | int 15–60 | no | `30` |
| `from` | ISO datetime | no | — |
| `to` | ISO datetime | no | — |

Auth: `executive`, `manager`, `department_head` (datos filtrados por `executive_scope` en M1).

**Response 200**

```json
{
  "venueId": "uuid",
  "windowMin": 30,
  "fetchedAt": "2026-06-09T18:45:12.000Z",
  "layer": "pulse",
  "zones": [
    { "zone": "lobby", "touches": 4, "deltaPct": 12.5 },
    { "zone": "room", "touches": 2, "deltaPct": -8.0 }
  ],
  "tags": [
    {
      "tagId": "uuid",
      "slug": "caribe-lobby",
      "label": "Lobby principal",
      "zone": "lobby",
      "touches": 4
    }
  ],
  "avex": {
    "recentSessions": 3,
    "derivationPct": 18.5,
    "topTopics": ["horarios restaurante", "room service"]
  },
  "alertsSummary": {
    "critical": 0,
    "attention": 1
  }
}
```

**Headers**: `Cache-Control: no-store`

---

## Capa 1+2+4 — Overview consolidado (M2)

### GET `/api/executive/overview`

Solo rol `executive` (Gerente General).

| Query | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| `venueId` | uuid | sí | — |
| `period` | `7d` \| `30d` | no | `7d` |
| `from` | ISO datetime | no | — |
| `to` | ISO datetime | no | — |

**Response 200**

```json
{
  "venueId": "uuid",
  "period": "7d",
  "fetchedAt": "2026-06-09T18:45:12.000Z",
  "baselineStatus": {
    "ready": false,
    "day": 3,
    "totalTouches": 42,
    "firstTouchAt": "2026-06-01T14:30:00.000Z"
  },
  "kpis": [
    {
      "key": "total_interactions",
      "label": "Interacciones totales",
      "definition": "Toques NFC y accesos al hub en el período",
      "layer": "performance",
      "department": "executive",
      "value": 128,
      "target": 150,
      "comparison": "gte",
      "deltaPct": 8.2,
      "onTarget": null,
      "suggestedAction": null
    }
  ],
  "trend": [
    { "day": "2026-06-03", "touches": 18 },
    { "day": "2026-06-04", "touches": 22 }
  ],
  "roi": {
    "staffMinutesSaved": 24.5,
    "selfServiceMinutes": 8.0,
    "totalMinutes": 32.5,
    "deltaPct": 5.1,
    "label": "Estimado operativo"
  },
  "departmentSummaries": [
    {
      "scope": "operations",
      "label": "Operaciones",
      "primaryKpi": {
        "key": "nfc_direct_rate",
        "label": "Acceso NFC directo",
        "definition": "% toques con channel=nfc",
        "layer": "performance",
        "department": "operations",
        "value": 68.0,
        "target": 70.0,
        "comparison": "gte",
        "deltaPct": -2.0,
        "onTarget": null,
        "suggestedAction": "Reforzar señalización en habitaciones"
      },
      "alertCount": 0
    }
  ],
  "topAlerts": []
}
```

**Notas**:
- `onTarget` es `null` mientras `baselineStatus.ready === false` (CL-11).
- `suggestedAction` poblado por `lib/executive/narrative.ts` en M2.

---

## Errores comunes

```json
{
  "error": "UNAUTHORIZED",
  "message": "Sesión requerida"
}
```

```json
{
  "error": "FORBIDDEN",
  "message": "Se requiere rol gerencial"
}
```

---

## ROI aislado (M2)

### GET `/api/executive/roi`

Mismos query params que overview (`venueId`, `period`, `from`, `to`). Solo rol `executive`.

---

## Alertas (M3)

### GET `/api/executive/alerts`

| Query | Tipo | Default |
|-------|------|---------|
| `venueId` | uuid | requerido |
| `status` | alert status | — |
| `severity` | attention \| critical | — |
| `department` | executive scope | — |
| `limit` | int 1–100 | 50 |

### PATCH `/api/executive/alerts/[id]`

Body: `{ "action": "acknowledge" | "assign" | "dismiss", "assignTo"?: uuid }`

Registra acción en `executive_audit_log`.

### POST `/api/executive/alerts/evaluate`

Auth: `Authorization: Bearer <CRON_SECRET>`. Evalúa reglas CL-02/03/04.

---

## Dashboard departamental (M4)

### GET `/api/executive/department/[scope]`

`scope`: `operations` | `fnb` | `experience` | `front_office`

Query: `venueId`, `period` (7d|30d), `zone?`, `tagId?`

Filtrado por `executive_scope` del usuario (CL-13).

### POST `/api/executive/content-correction`

Body: `{ venueId, tagId, tagLabel, note? }` — audit `request_content_correction`.

---

## Reportes (M5)

### GET `/api/executive/reports/export`

| Query | Tipo | Default |
|-------|------|---------|
| `venueId` | uuid | requerido |
| `period` | 7d \| 30d | 7d |
| `format` | csv \| json | csv |

Solo rol `executive`. Registra `export_report` en audit log.

---

## Configuración (M6)

### GET `/api/executive/thresholds`

| Query | Tipo |
|-------|------|
| `venueId` | uuid (requerido) |

Solo rol `executive`. Retorna umbrales activos CL-02/03/04.

**Response 200**

```json
{
  "venueId": "uuid",
  "thresholds": [
    {
      "id": "uuid",
      "venueId": "uuid",
      "alertType": "avex_derivation",
      "department": "front_office",
      "config": { "attention_pct": 25, "critical_pct": 40 },
      "isActive": true
    }
  ]
}
```

### PATCH `/api/executive/thresholds`

Body:

```json
{
  "venueId": "uuid",
  "id": "uuid",
  "config": { "attention_pct": 20 },
  "isActive": true
}
```

Audit: `update_threshold`. Aplica en próxima evaluación cron.

### GET `/api/executive/kpis`

Query: `venueId` (uuid). Solo rol `executive`. Retorna metas CL-08.

### PATCH `/api/executive/kpis`

Body:

```json
{
  "venueId": "uuid",
  "id": "uuid",
  "targetValue": 150,
  "comparison": "gte"
}
```

Audit: `update_kpi_target`.

---

## Rutas UI gerenciales

| Ruta | Rol mínimo | Milestone |
|------|------------|-----------|
| `/executive/overview` | executive | M2 |
| `/executive/operations` | manager (scope) | M4 |
| `/executive/fnb` | manager (scope) | M5 |
| `/executive/experience` | manager (scope) | M5 |
| `/executive/front-office` | department_head | M4 |
| `/executive/alerts` | gerencial (scope) | M3 |
| `/executive/reports` | executive | M5 |
| `/executive/settings` | executive | M6 |