# Contract: Staff NFC Session

**Versión**: 1.0 | **Consumidor**: `app/(guest)/s/[tagSlug]`, `app/api/staff/sessions/*`

---

## GET `/s/{staffTagSlug}` (Server-rendered)

Página de entrada tras toque NFC de tarjeta staff.

### Resolución

1. `SELECT` `staff_nfc_tags` JOIN `staff_members` JOIN `departments` JOIN `job_roles` WHERE `tag_slug = staffTagSlug` AND `is_active = true` AND `staff_members.is_active = true`
2. Si no existe o revocada → 404 "Tarjeta no válida"
3. Resolver `shift_id` vigente (asignación explícita) → incluir en snapshot
4. Dedup: si sesión `active` mismo tag + fingerprint < 45s → redirect a sesión existente
5. Crear `staff_capture_sessions` TTL 5 min
6. Registrar `touch_events` con `event_type = staff_capture_open`
7. Redirect → `/capture/{sessionToken}`

### SLA

| Métrica | Target |
|---------|--------|
| Redirect a formulario | ≤ 3s (FR-001) |

---

## POST `/api/staff/sessions/open`

Alternativa JSON (testing / integración).

### Request

```json
{
  "staffTagSlug": "caribe-staff-maria-g",
  "clientFingerprint": "sha256:..."
}
```

### Response 201

```json
{
  "sessionToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-06-10T14:35:00.000Z",
  "captureUrl": "/capture/550e8400-e29b-41d4-a716-446655440000",
  "staff": {
    "displayName": "María G.",
    "departmentName": "Housekeeping",
    "jobRoleTitle": "Camarista"
  },
  "deduplicated": false
}
```

### Response 404

```json
{ "error": "INVALID_STAFF_TAG", "message": "Tarjeta no válida o revocada" }
```

---

## GET `/api/staff/sessions/{sessionToken}`

Validar sesión activa (polling countdown UI).

### Response 200 (active)

```json
{
  "status": "active",
  "expiresAt": "2026-06-10T14:35:00.000Z",
  "secondsRemaining": 287,
  "staff": {
    "displayName": "María G.",
    "departmentName": "Housekeeping",
    "jobRoleTitle": "Camarista"
  },
  "stayLinked": true
}
```

### Response 410 (expired)

```json
{
  "status": "expired",
  "message": "La sesión expiró. Pide al personal que acerque su tarjeta nuevamente."
}
```

---

## Reglas

- Token no reutilizable tras `completed` o `expired` (FR-003)
- Staff no envía body; solo toque físico (NFR-004)
- `clientFingerprint` = hash parcial UA + IP (/24), generado client-side