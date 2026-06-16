# Guía de capacitación — Piso Hotel Caribe (T113)

**Audiencia**: Staff con tarjeta NFC, supervisores, recepción  
**Duración estimada**: 30 min por rol  
**Versión**: 1.0 · Fase 3 M6

---

## Staff operativo (tarjeta NFC personal)

1. **Lleve siempre su tarjeta NFC** asignada en el sistema (`/organization/staff`).
2. Al atender un huésped, **acerque la tarjeta al móvil del huésped** (o muéstrele el QR impreso).
3. El huésped verá su nombre y un temporizador de **5 minutos** para responder.
4. Puede elegir **Feedback** (calificación 1–5) o **Incidencia** (problema operativo).
5. Si no hay turno asignado, el feedback igual se registra; el supervisor verá "sin turno" en scorecard.
6. **No comparta tarjetas** entre empleados — cada slug es personal e intransferible.

**URL de ejemplo**: `https://{APP_URL}/s/caribe-staff-maria-g`

---

## Recepción (estadía + consolidación)

1. Login → `/reception`.
2. **Estadía formal**: generar cookie para huésped con check-in; dura según configuración del venue (default 7 días).
3. **Walk-in**: si el huésped ya dio feedback sin pasar por recepción, se creó estadía efímera (48 h).
4. **Consolidar**: `/reception/consolidate` — vincular estadía efímera a formal sin perder registros.
5. Verificar en panel que `guest_stay_id` queda unificado.

---

## Supervisor (organización sin desarrollo)

1. Login → menú **Organización** (`/organization`).
2. **Cargos**: crear "Camarista", "Mesero", etc. por departamento.
3. **Turnos**: definir "Mañana 6–14" y asignar a empleados.
4. **Empleados**: alta, cargo, tarjeta NFC y turno vigente.
5. **Incidencias**: bandeja `/incidents` — workflow abierta → cerrada.
6. **Scorecards**: `/scorecards` — NPS solo con n≥6 feedbacks.

---

## Contacto soporte piloto

- Problemas técnicos: equipo TagMe / desarrollo
- Cambios de personal o departamentos: RRHH + supervisor del área
- Lista de palabras moderación comentarios: pendiente decisión negocio (D-01)