# Contract: Guest Experience (Resolución Tag)

**Versión**: 1.0 | **Consumidor**: Next.js `app/(guest)/t/[tagSlug]`

---

## GET `/t/{tagSlug}` (Server-rendered page)

No es API JSON — contrato de comportamiento de página.

### Input

| Parámetro | Origen | Requerido |
|-----------|--------|-----------|
| `tagSlug` | Path URL (desde NFC) | Sí |

### Resolución (server-side)

1. Query `nfc_tags` JOIN `venues` JOIN `experience_configs` WHERE `slug = tagSlug` AND `is_active = true`
2. Si no existe → página 404 con `FallbackHelp` (instrucciones NFC + contacto recepción)
3. Si existe → disparar registro touch (ver [analytics-events.md](./analytics-events.md))
4. Render `GuestHub` con payload:

```typescript
interface GuestHubPayload {
  venue: {
    id: string;
    name: string;
    slug: string;
  };
  tag: {
    id: string;
    slug: string;
    label: string;
    zone: 'lobby' | 'room' | 'restaurant' | 'bar' | 'other';
    roomNumber: string | null;
  };
  experience: {
    title: string;
    welcomeMessage: string | null;
    destinations: Destination[];
    avexEnabled: boolean;
  };
  contact: {
    phone?: string;
    whatsapp?: string;
  };
}

interface Destination {
  id: string;
  type: 'menu' | 'external' | 'reservation_link' | 'info' | 'social';
  label: string;
  url: string;
  icon: string;
  isPrimary?: boolean;
}
```

### Response SLA

| Métrica | Target |
|---------|--------|
| TTFB | ≤ 500ms p95 |
| Contenido visible | ≤ 3s (NFR-001) |

### Errores

| Código | UI |
|--------|-----|
| Tag inactivo / no encontrado | 404 + FallbackHelp |
| DB timeout | 503 + retry button |

---

## GET `/api/tags/{tagSlug}` (opcional — JSON para debugging)

### Response 200

```json
{
  "tag": { "slug": "caribe-room-412", "zone": "room", "roomNumber": "412" },
  "venue": { "slug": "hotel-caribe", "name": "Hotel Caribe by Faranda Grand" },
  "experience": { "avexEnabled": true, "destinationCount": 4 }
}
```

### Response 404

```json
{ "error": "TAG_NOT_FOUND", "message": "Punto NFC no encontrado" }
```