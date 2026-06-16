# Contract: Scorecards Jerárquicos

**Versión**: 1.0 | **Consumidor**: Panel supervisor, vista staff personal, dashboards Fase 2

---

## GET `/api/scorecards/employee/{staffMemberId}`

### Query params

| Param | Tipo | Default |
|-------|------|---------|
| `period` | `7d` \| `30d` \| `90d` \| custom | `30d` |
| `from` | ISO date | — |
| `to` | ISO date | — |

### Auth

- Staff operativo: solo `staffMemberId` propio
- Supervisor: empleados en depto(s) asignado(s)
- Manager/admin: cualquier empleado del venue

### Response 200

```json
{
  "level": "employee",
  "staffMemberId": "uuid",
  "displayName": "María G.",
  "departmentName": "Housekeeping",
  "period": { "from": "2026-05-11", "to": "2026-06-10" },
  "metrics": {
    "feedbackCount": 8,
    "avgRating": 4.6,
    "npsInternal": 62.5,
    "insufficientData": false,
    "pctPromoters": 75.0,
    "pctDetractors": 12.5,
    "incidentCountLinked": 1,
    "trend7d": { "npsInternal": 50.0, "feedbackCount": 3 }
  }
}
```

### Response 200 (n < 6)

```json
{
  "metrics": {
    "feedbackCount": 3,
    "avgRating": 4.3,
    "npsInternal": null,
    "insufficientData": true,
    "message": "Datos insuficientes (n=3). Se requieren al menos 6 opiniones."
  }
}
```

Staff operativo **no** recibe `comments` en este endpoint (FR-037).

---

## GET `/api/scorecards/department/{departmentId}`

### Auth

Supervisor (depto asignado), manager, admin.

### Response 200

```json
{
  "level": "department",
  "departmentId": "uuid",
  "departmentName": "Housekeeping",
  "metrics": {
    "feedbackCount": 45,
    "npsInternal": 55.0,
    "insufficientData": false,
    "avgRating": 4.2,
    "openIncidents": 3,
    "closedIncidents": 12,
    "employeeRanking": [
      {
        "staffMemberId": "uuid",
        "displayName": "María G.",
        "feedbackCount": 8,
        "npsInternal": 62.5,
        "insufficientData": false
      }
    ]
  },
  "shifts": [
    {
      "shiftId": "uuid",
      "shiftName": "Mañana",
      "feedbackCount": 20,
      "npsInternal": 60.0,
      "insufficientData": false
    }
  ]
}
```

Incluye comentarios textuales solo para manager/admin (query `?includeComments=true`).

---

## GET `/api/scorecards/hotel`

Roll-up venue completo. Auth: manager, admin.

### Response 200

```json
{
  "level": "hotel",
  "venueId": "uuid",
  "venueName": "Hotel Caribe by Faranda Grand",
  "metrics": {
    "feedbackCount": 180,
    "npsInternal": 48.0,
    "insufficientData": false,
    "incidentRatePer100Stays": 4.2,
    "captureCoveragePct": 12.5,
    "departments": [
      {
        "departmentId": "uuid",
        "departmentName": "F&B",
        "npsInternal": 52.0,
        "feedbackCount": 60,
        "insufficientData": false
      }
    ]
  }
}
```

---

## GET `/api/metrics/feedback-summary` (Fase 2 enrichment)

Endpoint ligero para dashboards C-Level (OBJ-09).

```json
{
  "venueId": "uuid",
  "period": "7d",
  "npsInternal": 48.0,
  "feedbackCount": 42,
  "openIncidents": 5,
  "signalType": "direct_feedback"
}
```

Campo `signalType` distingue de proxies TagMétricas (`proxy_touch`, `proxy_avex`).

---

## Fórmulas (referencia)

```
NPS_interno = (% rating=5) − (% rating∈{1,2})
insufficientData = feedbackCount < venue_staff_settings.min_feedbacks_for_nps
```

Registros con `shift_id IS NULL` excluidos de roll-up por turno, incluidos en empleado y departamento.