# Contract: AVEX Chat API

**Versión**: 1.0 | **FR**: FR-016–FR-019 | **Backend**: Next.js API Route → InsForge Model Gateway

---

## POST `/api/avex/chat`

Chat conversacional streaming (Q1=B).

### Request

```json
{
  "sessionToken": "uuid-v4",
  "tagSlug": "caribe-room-412",
  "message": "¿A qué hora abre el restaurante?"
}
```

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `sessionToken` | string | Sí | UUID; crear sesión si no existe |
| `tagSlug` | string | Sí | Tag activo con `avex_enabled` |
| `message` | string | Sí | 1–500 caracteres; trim |

### Response 200 (SSE stream)

```
Content-Type: text/event-stream

data: {"type":"token","content":"El restaurante"}
data: {"type":"token","content":" abre a las 7:00 AM"}
data: {"type":"done","escalated":false,"sessionId":"uuid"}
```

### Event types

| type | Payload |
|------|---------|
| `token` | `{ content: string }` — fragmento respuesta |
| `escalation` | `{ reason: string, contact: { phone?, whatsapp? } }` |
| `redirect` | `{ destinationType: "reservation_link", url: string }` — intención transaccional |
| `done` | `{ escalated: boolean, sessionId: string }` |
| `error` | `{ code: string, message: string }` |

### Guardrails (server-side, obligatorio)

| Condición | Acción |
|-----------|--------|
| Intención reserva/pago detectada | `redirect` o mensaje fijo + URL reservas; **no** llamar LLM para confirmar |
| KB vacía para venue | `escalation` inmediata |
| Timeout > 15s | `error` `AVEX_TIMEOUT` |
| Mensaje > 500 chars | 400 `MESSAGE_TOO_LONG` |

### System prompt contract (interno)

El servidor construye prompt con:

```
- Rol: AVEX, asistente del {venue.name}
- Contexto: zona={tag.zone}, habitación={tag.room_number || 'N/A'}
- KB: {knowledge_entries activas concatenadas}
- Restricción: NO reservar, NO pagar, NO inventar políticas
- Si no sabes: ofrecer contacto {contact_info}
```

### Persistencia

Cada request INSERT:
- `avex_messages` role=`user` (mensaje huésped)
- `avex_messages` role=`assistant` (respuesta completa al finalizar stream)

### Response 400

```json
{ "error": "AVEX_DISABLED", "message": "AVEX no habilitado para este punto" }
```

### Response 429

```json
{ "error": "RATE_LIMIT", "message": "Demasiados mensajes; intenta en unos minutos" }
```

Límite MVP: 20 mensajes / sesión / hora.

---

## Client contract (`AvexChat.tsx`)

| Estado | Comportamiento |
|--------|----------------|
| Loading | Typing indicator mientras stream activo |
| Escalation | Mostrar `AvexEscalation` con botones tel/WhatsApp |
| Redirect | Botón "Ir a reservas" — registrar `destination_visit` type=`reservation_link` |
| Error | Mensaje amigable + opción reintentar |