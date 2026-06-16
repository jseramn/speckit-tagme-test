# Contract: Guest Stay (Cookie de Estadía)

**Versión**: 1.0 | **Consumidor**: Recepción autenticada, middleware captura huésped

---

## Cookie

| Atributo | Valor |
|----------|-------|
| Nombre | `tagme_stay` |
| Valor | `stay_token` opaco (32+ bytes base64url) |
| HttpOnly | true |
| Secure | true (production) |
| SameSite | Lax |
| Path | `/` |
| Max-Age | Según `guest_stays.expires_at` |

---

## Auth — capacidad recepción

Todos los endpoints `/api/reception/stays/*` (excepto lógica interna service role) requieren **`canManageGuestStays()`** (= `requireReception()`):

- `admin` o `manager` del venue, o
- `staff_member` activo en departamento con `departments.code = 'RECEPCION'`.

Ver spec §Capacidad recepción.

---

## POST `/api/reception/stays` (auth: `canManageGuestStays`)

Crear estadía **formal** en check-in (FR-006).

### Request

```json
{
  "venueId": "uuid",
  "ttlDays": 7
}
```

### Response 201

```json
{
  "stayId": "uuid",
  "stayToken": "opaque-token",
  "stayType": "formal",
  "expiresAt": "2026-06-17T10:00:00.000Z",
  "cookieSet": true
}
```

Set-Cookie: `tagme_stay={stayToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`

---

## POST `/api/reception/stays/consolidate` (auth: `canManageGuestStays`)

Fusionar estadía efímera → formal (FR-010b, Q3=B).

### Request

```json
{
  "ephemeralStayToken": "token-from-walk-in",
  "formalStayId": "uuid-of-new-formal-stay"
}
```

O crear formal y consolidar en un paso:

```json
{
  "ephemeralStayToken": "token-from-walk-in"
}
```

### Response 200

```json
{
  "formalStayId": "uuid",
  "consolidatedRecords": {
    "feedbacks": 2,
    "incidents": 1
  },
  "ephemeralStatus": "consolidated"
}
```

### Reglas

- Transacción atómica: UPDATE `feedback_entries`, `incident_reports`, `guest_stays`
- Trazabilidad: `guest_stays.consolidated_into` preservado
- Estadía efímera no acepta nuevos registros tras consolidación

---

## POST `/api/stays/ephemeral` (interno — service role)

Auto-crear al primer captura sin cookie (FR-010). Invocado desde `/api/capture/*`, no expuesto directamente al cliente.

### Lógica

1. Leer cookie `tagme_stay` → si válida y `status=active`, usar existente
2. Si no cookie: INSERT `guest_stays` `stay_type=ephemeral`, TTL 48h
3. Emitir Set-Cookie
4. Retornar `guest_stay_id`

---

## POST `/api/reception/stays/{stayId}/close` (auth: `canManageGuestStays`)

Checkout manual MVP (FR-008).

### Response 200

```json
{
  "stayId": "uuid",
  "status": "closed",
  "closedAt": "2026-06-10T11:00:00.000Z"
}
```

Cookie expirada (Max-Age=0).

---

## GET `/api/reception/stays/lookup` (auth: `canManageGuestStays`)

Buscar estadía activa por token (consolidación asistida).

### Query

`?stayToken=opaque-token`

### Response 200

```json
{
  "stayId": "uuid",
  "stayType": "ephemeral",
  "status": "active",
  "startedAt": "...",
  "expiresAt": "...",
  "recordCounts": { "feedbacks": 2, "incidents": 0 }
}
```