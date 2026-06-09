# Contract: Admin API (Staff / Operaciones)

**Versión**: 1.0 | **Auth**: InsForge JWT — roles `staff` | `admin`

Todas las rutas bajo `/(admin)` o `/api/admin/*` requieren sesión válida. Staff limitado a `venue_id` de su perfil.

---

## Auth

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| InsForge Auth | SDK | `signInWithPassword` / magic link |
| `/api/admin/me` | GET | Perfil + venue asignado |

### GET `/api/admin/me` Response 200

```json
{
  "userId": "uuid",
  "role": "staff",
  "venueId": "uuid",
  "venueName": "Hotel Caribe by Faranda Grand",
  "displayName": "María Recepción"
}
```

---

## Venues & Tags (US-4, US-7)

### GET `/api/admin/tags?venueId={id}`

Lista puntos NFC del venue.

### POST `/api/admin/tags` (admin only)

```json
{
  "venueId": "uuid",
  "slug": "caribe-room-501",
  "label": "Habitación 501",
  "zone": "room",
  "roomNumber": "501",
  "experienceConfigId": "uuid"
}
```

### PATCH `/api/admin/tags/{id}`

Actualizar `label`, `zone`, `roomNumber`, `is_active`, `experienceConfigId`.

**Regla FR-012**: cambios visibles en guest hub en ≤ 5 min (ISR revalidate).

---

## Experience Config (US-4)

### GET `/api/admin/experience/{venueId}`

### PUT `/api/admin/experience/{id}`

```json
{
  "title": "Bienvenido a Hotel Caribe",
  "welcomeMessage": "Toque un destino para comenzar",
  "avexEnabled": true,
  "destinations": [ /* ver data-model.md */ ]
}
```

Validación Zod: al menos 1 destino; URLs válidas; un solo `isPrimary`.

---

## Knowledge Base AVEX (FR-020)

### GET `/api/admin/knowledge?venueId={id}`

### POST `/api/admin/knowledge`

```json
{
  "venueId": "uuid",
  "category": "hours",
  "title": "Horario restaurante",
  "content": "El restaurante abre de 7:00 AM a 10:00 PM todos los días."
}
```

### PATCH `/api/admin/knowledge/{id}`

### DELETE `/api/admin/knowledge/{id}` (soft: `is_active = false`)

---

## Staff Help — URL fallback (US-5)

### GET `/api/admin/tags/{id}/fallback`

Response para staff cuando huésped no tiene NFC:

```json
{
  "shortUrl": "https://tagme.app/t/caribe-lobby",
  "qrDataUrl": null,
  "instructions": "Abra esta URL en el navegador del huésped"
}
```

`channel` del próximo touch debe ser `staff_assisted` si staff indica que ayudó.

---

## Audit Log (NFR-006)

Tabla `content_audit_log` (implícita):

| Campo | Valor |
|-------|-------|
| `user_id` | Quién |
| `entity` | `experience_config` \| `knowledge_entry` \| `nfc_tag` |
| `entity_id` | UUID |
| `action` | `create` \| `update` \| `delete` |
| `diff` | jsonb snapshot |
| `created_at` | timestamp |

---

## Errores comunes

| Código HTTP | error | Cuándo |
|-------------|-------|--------|
| 401 | `UNAUTHORIZED` | Sin sesión |
| 403 | `FORBIDDEN` | Staff accede venue ajeno |
| 422 | `VALIDATION_ERROR` | Zod fail — incluir `details[]` |