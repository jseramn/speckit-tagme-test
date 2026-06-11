# Data Model: Demo Hotel Caribe (vista operativa)

**Fecha**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Este documento **no define schema nuevo**. Mapea entidades existentes de Fase 3 a los actores y datos del guion demo.

---

## Venue

| Campo | Valor demo |
|-------|------------|
| `venues.slug` | `hotel-caribe` |
| Nombre visible | Hotel Caribe by Faranda Grand |

---

## Staff protagonistas

| display_name | slug NFC | dept code | Uso guion |
|--------------|----------|-----------|-----------|
| María G. | `caribe-staff-maria-g` | HK | Protagonista feedback + incidencia |
| Carlos P. | `caribe-staff-carlos-p` | HK | Backup / E2E |
| Ana R. | `caribe-staff-ana-r` | RECEPCION | Usuario recepción piloto |
| Roberto H. | `caribe-staff-roberto-h` | MANT | Incidencia mantenimiento (con manager) |

---

## Tags habitación / zona

| slug | zone | room_number | URL captura |
|------|------|-------------|-------------|
| `caribe-room-412` | room | 412 | `/capture/room/caribe-room-412` |
| `caribe-lobby` | lobby | — | `/t/caribe-lobby` (contexto opcional) |

---

## Usuarios piloto (auth)

| Rol | Email default | Rutas demo |
|-----|---------------|------------|
| supervisor | `supervisor.caribe@tagme.pilot` | `/incidents`, `/scorecards` |
| manager | `manager.caribe@tagme.pilot` | fallback bandeja global |
| reception | `reception.caribe@tagme.pilot` | `/reception` |

Vínculo: `user_profiles` ↔ `staff_members` vía `staff_member_id` (seed-pilot-users).

---

## Datos demo (capa `seed_tag`)

| Entidad | seed_tag | Cantidad | Propósito |
|---------|----------|----------|-----------|
| `feedback_entries` | `seed-f3-scorecard-feedbacks` | 8 × empleado activo | NPS n≥6 |
| `incident_reports` | `seed-demo-hotel-prep` *(nuevo)* | 2–3 | Bandeja precargada |
| Comentarios curados | `seed-demo-hotel-prep` *(opcional)* | patch | Copy realista |

---

## Flujo de trazabilidad (campos clave)

### Feedback

| Campo | Staff NFC | Room NFC |
|-------|-----------|----------|
| `origin_type` | `staff_nfc` | `room_nfc` |
| `staff_member_id` | poblado | null |
| `guest_stay_id` | cookie / efímero | cookie / efímero |
| `context_snapshot` | staff, dept, shift | room, zone |

### Incidencia

| Campo | Descripción demo |
|-------|------------------|
| `status` | `abierta` → `en_progreso` → `resuelta` → `cerrada` |
| `category` | Código seed (`mantenimiento`, `ruido`, etc.) |
| `default_department_id` | Ruteo a supervisor del depto |

---

## Relaciones para el guion

```text
staff_nfc_tags (maria-g)
    → staff_capture_sessions (TTL 5 min)
        → feedback_entries | incident_reports
            → guest_stays (cookie)
            → v_scorecard_* (agregación)
            → supervisor incidents API
```