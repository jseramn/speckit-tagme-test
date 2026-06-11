# Research: Preparación Demo Hotel Caribe

**Fecha**: 2026-06-11 | **Plan**: [plan.md](./plan.md)

Decisiones consolidadas para la fase de preparación demo. Sin NEEDS CLARIFICATION pendientes.

---

## R1 — Entorno de demo

**Decision**: Usar deploy de producción/staging Vercel apuntando a InsForge piloto (`hotel-caribe`), no `next dev` en la sala.

**Rationale**: Turbopack dev tiene latencia variable; producción garantiza tiempos ≤3 s más predecibles y evita `STAFF_DEV_TOKEN` accidental.

**Alternatives considered**:
- Dev server local + laptop como hotspot — rechazado: depende de red del facilitador y no refleja piloto real.
- Grabación en video — rechazado: el hotel necesita ver captura en vivo para confianza.

---

## R2 — Estrategia de datos

**Decision**: Capa híbrida — seed estructural idempotente existente + capa demo (`seed_tag: seed-demo-hotel-prep`) para incidencias y curación de copy.

**Rationale**: `seed-scorecard-feedbacks.ts` ya garantiza n≥6 pero con comentarios técnicos; re-seed completo es lento y arriesgado. Capa demo es reversible y no toca org structure.

**Alternatives considered**:
- Base de datos limpia desde cero — rechazado: alto riesgo, mucho tiempo.
- Solo capturas en vivo sin seed — rechazado: scorecards vacíos arruinan el acto 4 del guion.

---

## R3 — Empleados protagonistas

**Decision**: María G. (`caribe-staff-maria-g`) como protagonista única del guion en vivo; Carlos P. (`caribe-staff-carlos-p`) reservado para E2E/backup.

**Rationale**: E2E paralelo usa slugs distintos (`maria-g` vs `carlos-p`) para evitar `SESSION_EXPIRED`. La spec mencionaba `carlos-r` que no existe en seed.

**Alternatives considered**:
- Roberto H. (Mantenimiento) como protagonista — rechazado: supervisor piloto solo tiene dept HK asignado; requeriría manager para bandeja.

---

## R4 — Incidencias en bandeja

**Decision**: Precargar 2–3 incidencias + crear 1 en vivo durante demo.

**Rationale**: Bandeja vacía transmite "producto incompleto". Precarga + en vivo demuestra tanto historial como tiempo real.

**Alternatives considered**:
- Solo incidencia en vivo — rechazado: si falla red, bandeja queda vacía.
- Mock estático (screenshot) — rechazado: pierde credibilidad operativa.

---

## R5 — Alcance de cambios de código

**Decision**: Máximo 3 archivos de producto + 3 scripts nuevos; todo lo demás es documentación y ensayo.

**Rationale**: Alineado con spec §2.4 — preparación, no producto.

**Alternatives considered**:
- Sprint de pulido UI (skeletons, animaciones) — rechazado: bajo ROI para audiencia operativa.
- E2E completo incidencias en CI — diferido post-demo; smoke manual suficiente para T-48h.

---

## R6 — Supervisor vs manager en demo

**Decision**: Supervisor HK para flujo principal; manager como fallback si se muestra incidencia de Mantenimiento.

**Rationale**: `seed-pilot-users.ts` asigna supervisor solo a dept HK (`supervisorDeptCode: "HK"`).

**Alternatives considered**:
- Crear segundo supervisor Mantenimiento — rechazado: requiere seed adicional y más logins en sala.