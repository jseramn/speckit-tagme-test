# Contract: Analytics Events (TagMétricas)

**Versión**: 1.0 | **Productor**: Guest UI / API Routes | **Consumidor**: InsForge PostgreSQL

---

## POST `/api/events/touch`

Registra toque NFC o acceso por URL (FR-005).

### Request

```json
{
  "tagSlug": "caribe-lobby",
  "channel": "nfc",
  "clientFingerprint": "sha256:abc123..."
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `tagSlug` | string | Sí | Debe existir en `nfc_tags` |
| `channel` | enum | Sí | `nfc` \| `url_direct` \| `staff_assisted` |
| `clientFingerprint` | string | No | Para deduplicación 60s |

### Headers (server-enriched)

| Header | Uso |
|--------|-----|
| `User-Agent` | → `device_type` |
| `x-vercel-ip-country` | → `country_code` |

### Response 201

```json
{
  "touchEventId": "uuid",
  "deduplicated": false
}
```

### Response 201 (deduplicated)

```json
{
  "touchEventId": "uuid",
  "deduplicated": true
}
```

### Response 400

```json
{ "error": "INVALID_TAG", "message": "tagSlug no válido" }
```

### SLA

Registro completado en ≤ 1s (SC-002). Fire-and-forget en cliente; `sendBeacon` en `beforeunload` como fallback.

---

## POST `/api/events/destination`

Registra visita a destino (FR-008).

### Request

```json
{
  "touchEventId": "uuid",
  "destinationType": "menu",
  "destinationUrl": "https://menu.example.com"
}
```

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `touchEventId` | uuid | Sí |
| `destinationType` | enum | Sí — `menu` \| `external` \| `reservation_link` \| `info` \| `social` \| `avex` |
| `destinationUrl` | string | Condicional — requerido si type ≠ `avex` |

### Response 201

```json
{ "destinationVisitId": "uuid" }
```

---

## GET `/api/metrics/summary` (admin auth required)

Dashboard TagMétricas (FR-006–011).

### Query params

| Param | Tipo | Default |
|-------|------|---------|
| `venueId` | uuid | requerido |
| `from` | ISO date | 7 días atrás |
| `to` | ISO date | hoy |
| `tagId` | uuid | opcional filtro |

### Response 200

```json
{
  "venueId": "uuid",
  "period": { "from": "2026-06-01", "to": "2026-06-08" },
  "touchesDaily": [
    { "date": "2026-06-07", "count": 255 }
  ],
  "peakHours": [
    { "hour": 23, "count": 120 }
  ],
  "destinationBreakdown": [
    { "type": "menu", "count": 860, "percentage": 60.1 }
  ],
  "deviceBreakdown": [
    { "type": "iphone", "count": 304, "percentage": 95.3 }
  ],
  "countryBreakdown": [
    { "countryCode": "CO", "count": 150 }
  ]
}
```