# Quickstart — Capa de Visibilidad Gerencial (Hotel Caribe)

**Fase:** 002-tagme-clevel · **Venue piloto:** Hotel Caribe by Faranda Grand  
**Audiencia:** Gerente General, gerentes de área, jefe de recepción

---

## 1. Acceso al sistema

### Usuarios demo (desarrollo / capacitación)

Ejecute el seed si aún no lo hizo:

```bash
npm run db:migrate
npm run seed
```

| Email | Rol | Vista principal |
|-------|-----|-----------------|
| `gg@hotel-caribe.demo` | Gerente General (`executive`) | `/executive/overview` |
| `ops-manager@hotel-caribe.demo` | Gerente Operaciones | `/executive/operations` |
| `fnb-manager@hotel-caribe.demo` | Gerente F&B | `/executive/fnb` |
| `experience-manager@hotel-caribe.demo` | Gerente Experiencia | `/executive/experience` |
| `front-office@hotel-caribe.demo` | Jefe Recepción | `/executive/front-office` |

**Contraseña:** variable `EXECUTIVE_DEMO_PASSWORD` en `.env.local`, o por defecto `TagMe-Caribe-Demo-2026!`.

### Usuarios reales del piloto (producción)

Los usuarios de producción **no** se crean en el seed. Provisión manual en InsForge Auth:

1. Consola InsForge → **Auth** → crear usuario con email corporativo del hotel.
2. Tabla `user_profiles`: asignar `role`, `venue_id` (Hotel Caribe) y `executive_scope` según matriz CL-13.
3. Validar acceso: `GET /api/executive/me` debe devolver 200 con el rol correcto.

| Rol sugerido piloto | `role` | `executive_scope` |
|---------------------|--------|-------------------|
| Gerente General | `executive` | `null` |
| Gerente Operaciones | `manager` | `operations` |
| Gerente F&B | `manager` | `fnb` |
| Gerente Experiencia | `manager` | `experience` |
| Jefe Recepción | `department_head` | `front_office` |

### Desarrollo local sin login

En `.env.local`:

```env
STAFF_DEV_TOKEN=dev-local-token
STAFF_DEV_EXECUTIVE_ROLE=executive
STAFF_DEV_VENUE_SLUG=hotel-caribe
```

Con el servidor en `npm run dev`, las rutas `/executive/*` quedan accesibles sin cookie.

---

## 2. Tour del dashboard (Gerente General) — 10 min

1. **Iniciar sesión** → redirige a `/executive/overview`.
2. **Banner de calibración** (semana 1): indica días restantes hasta baseline de 14 días. Los semáforos KPI permanecen neutros.
3. **Pulso en tiempo real** (panel izquierdo): actividad últimos 30 min por zona, AVEX reciente, resumen de alertas. Se actualiza cada 30 s.
4. **KPIs clave**: interacciones, resolución AVEX, ROI estimado. Cada tarjeta incluye variación vs. período anterior.
5. **Tendencia semanal**: gráfico de toques diarios.
6. **Resumen por departamento**: acceso rápido a Operaciones, F&B, Experiencia, Recepción.
7. **Alertas activas**: top 3 con enlace a bandeja completa `/executive/alerts`.
8. **Filtro período**: alternar 7d / 30d en la cabecera.

**Criterio SC-G001:** el GG identifica pulso + 3 KPIs + tendencia en ≤ 2 minutos.

---

## 3. Flujos operativos clave

| Acción | Ruta | Quién |
|--------|------|-------|
| Revisar alertas | `/executive/alerts` | Todos los roles gerenciales (scope) |
| Reconocer / asignar alerta | Bandeja → acciones | Manager / GG |
| Exportar reporte CSV/PDF | `/executive/reports` | Solo `executive` |
| Configurar umbrales y metas | `/executive/settings` | Solo `executive` |
| Solicitar corrección de contenido | Dashboard dept. → tag | Manager / GG |

### Evaluación manual de alertas (dev)

```bash
npm run alerts:evaluate
```

En producción, Vercel Cron ejecuta `POST /api/executive/alerts/evaluate` cada 5 minutos.

---

## 4. Calibración de 14 días (CL-11)

| Día | Qué esperar |
|-----|-------------|
| 1–7 | Banner "período de calibración"; sin alertas de caída de actividad; metas KPI sin semáforo rojo |
| 8–14 | Baseline acumula mediana horaria; alertas de actividad pueden activarse si hay datos suficientes |
| 15+ | `baseline_ready=true`; semáforos KPI activos; comparativos confiables |

**Gracia tags nuevos:** 72 h sin alertas de inactividad (CL-10).

---

## 5. Sesión de capacitación — guion 30 min (T092)

### Minutos 0–5: Contexto

- TagMe **complementa** PMS y operación; no reemplaza check-in ni housekeeping.
- Objetivo piloto: supervisar experiencia digital y operación **sin reportes manuales** para las señales cubiertas.

### Minutos 5–12: Demo Panorama

- Login GG → overview en vivo.
- Explicar pulso: "¿Qué pasa ahora en lobby, habitaciones, restaurante?"
- Mostrar un KPI con meta (después de semana 2).

### Minutos 12–18: Alertas y acción

- Abrir `/executive/alerts`.
- Reconocer una alerta de demostración.
- Explicar severidad: atención vs. crítica.

### Minutos 18–24: Departamentos

- Gerente de área entra con su usuario → solo ve su dashboard + alertas de su scope.
- Demo solicitud de corrección de contenido en un tag débil.

### Minutos 24–28: Reportes y configuración

- GG exporta CSV semanal (`/executive/reports`).
- GG ajusta umbral de derivación AVEX en `/executive/settings` (ej. 25% → 20%).

### Minutos 28–30: Cierre y piloto

- Entregar checklist `checklists/pilot-validation-executive.md`.
- Acordar punto de contacto TI (cron alertas, acceso usuarios).
- Semana 1 = observación; semana 2+ = metas activas.

---

## 6. Referencias

- Constitution: `specs/002-clevel/constitution.md` §8 (criterio done fase)
- API: `specs/002-clevel/contracts/executive-api.md`
- Validación piloto: `specs/002-clevel/checklists/pilot-validation-executive.md`