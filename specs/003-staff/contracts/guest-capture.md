# Contract: Guest Capture (Feedback & Incidencia)

**Versión**: 1.0 | **Consumidor**: `app/(guest)/capture/[sessionToken]`, `app/(guest)/capture/room/[tagSlug]`

---

## GET `/capture/{sessionToken}` (UI)

Pantalla de elección y formularios. Requiere sesión `active` y `expires_at > NOW()`.

### Payload UI

```typescript
interface CapturePagePayload {
  mode: 'staff_session';
  sessionToken: string;
  expiresAt: string;
  staff: {
    displayName: string;
    departmentName: string;
    jobRoleTitle: string;
  };
  choices: ('feedback' | 'incident')[];
}
```

---

## GET `/capture/room/{tagSlug}` (UI)

Captura sin staff presente (FR-021).

### Resolución

1. Resolver `nfc_tags` activo (Fase 1)
2. Auto-vincular o crear `guest_stay` efímero si no hay cookie
3. Registrar `touch_events` `event_type = room_capture_open`
4. Mostrar contexto habitación/zona

```typescript
interface RoomCapturePayload {
  mode: 'room_nfc';
  tag: {
    id: string;
    slug: string;
    zone: string;
    roomNumber: string | null;
    label: string;
  };
  venue: { id: string; name: string };
}
```

---

## POST `/api/capture/feedback`

### Request

```json
{
  "sessionToken": "550e8400-...",
  "rating": 5,
  "comment": "Excelente atención"
}
```

O para room NFC (sin sesión staff):

```json
{
  "roomTagSlug": "caribe-room-412",
  "rating": 4,
  "comment": null
}
```

### Validaciones

- `rating` ∈ [1, 5]
- Sesión staff: `status = active`, no expirada
- `guest_stay_id` resuelto (cookie o auto-efímero)
- Origen completo obligatorio (NFR-008)

### Response 201

```json
{
  "id": "uuid",
  "createdAt": "2026-06-10T14:32:00.000Z",
  "message": "¡Gracias por tu opinión!"
}
```

### Efectos colaterales

1. `staff_capture_sessions.status` → `completed` (si aplica)
2. Scorecard empleado actualizado (≤60s, FR-013)

### Response 410

Sesión expirada — sin persistir borrador.

---

## POST `/api/capture/incident`

### Request

```json
{
  "sessionToken": "550e8400-...",
  "category": "mantenimiento",
  "description": "El aire acondicionado no enfría",
  "priority": "urgente"
}
```

### Validaciones

- `category` debe existir en `venue_incident_categories`
- Sin campo `rating` (FR-014, FR-020)
- `priority` opcional; default desde categoría

### Response 201

```json
{
  "id": "uuid",
  "status": "abierta",
  "category": "mantenimiento",
  "priority": "alta",
  "createdAt": "2026-06-10T14:33:00.000Z"
}
```

### Efectos colaterales

1. INSERT `incident_status_history` (from_status: null, to_status: abierta)
2. Ruteo a `department_id` según categoría
3. Visible en bandeja supervisor ≤60s (SC-007)

---

## Errores comunes

| Código | Error | UI |
|--------|-------|-----|
| 400 | `MISSING_ORIGIN` | Error técnico — no mostrar al huésped |
| 410 | `SESSION_EXPIRED` | Mensaje + pedir nuevo toque staff |
| 422 | `INVALID_RATING` | Validación formulario |