# Contract: Supervisor Panel & Configuración Organizacional

**Versión**: 1.0 | **Consumidor**: `app/(supervisor)/*`

---

## Auth & scope

Todos los endpoints requieren JWT InsForge. Scope:

- **Supervisor**: `department_id IN supervisor_department_assignments`
- **Manager/admin**: venue completo

---

## Incidencias

### GET `/api/supervisor/incidents`

### Query

| Param | Valores |
|-------|---------|
| `status` | `abierta`, `en_progreso`, `resuelta`, `cerrada`, `open` (abierta+en_progreso) |
| `departmentId` | UUID (supervisor: solo asignados) |
| `category` | código categoría |
| `limit` | default 50 |

### Response 200

```json
{
  "items": [
    {
      "id": "uuid",
      "status": "abierta",
      "category": "mantenimiento",
      "priority": "alta",
      "description": "AC no enfría",
      "originType": "staff_nfc",
      "originLabel": "NFC Staff — María G.",
      "roomNumber": "412",
      "departmentName": "Mantenimiento",
      "createdAt": "2026-06-10T14:33:00.000Z",
      "assignedTo": null
    }
  ],
  "total": 1
}
```

### PATCH `/api/supervisor/incidents/{id}`

```json
{
  "status": "en_progreso",
  "assignedToStaffMemberId": "uuid",
  "note": "Técnico enviado a habitación 412"
}
```

Transiciones válidas: `abierta` → `en_progreso` → `resuelta` → `cerrada`.

Cada cambio INSERT en `incident_status_history`.

---

## Configuración organizacional

### CRUD `/api/supervisor/departments`

Manager: CRUD venue. Supervisor: CRUD solo depto(s) asignado(s).

### CRUD `/api/supervisor/job-roles`

Por `departmentId`. Scope: supervisor (depto asignado), manager/admin (venue). FR-028.

Body (POST/PATCH):

```json
{
  "departmentId": "uuid",
  "title": "Camarista",
  "isActive": true
}
```

Response 200 (GET list):

```json
{
  "items": [
    {
      "id": "uuid",
      "departmentId": "uuid",
      "title": "Camarista",
      "isActive": true
    }
  ]
}
```

Errores: 403 si supervisor consulta depto no asignado; 404 si `departmentId` inválido.

### CRUD `/api/supervisor/shifts`

Por `departmentId`. Body:

```json
{
  "departmentId": "uuid",
  "name": "Mañana 6–14",
  "startTime": "06:00",
  "endTime": "14:00",
  "daysOfWeek": [1, 2, 3, 4, 5, 6, 7]
}
```

### CRUD `/api/supervisor/staff-members`

```json
{
  "departmentId": "uuid",
  "jobRoleId": "uuid",
  "displayName": "Carlos R.",
  "userProfileId": null,
  "isActive": true
}
```

### POST `/api/supervisor/staff-members/{id}/nfc-tag`

Asignar o reemplazar tarjeta.

```json
{
  "tagSlug": "caribe-staff-carlos-p"
}
```

Revoca tag anterior activo del mismo empleado.

### POST `/api/supervisor/staff-members/{id}/shift-assignment`

```json
{
  "shiftId": "uuid",
  "effectiveFrom": "2026-06-10",
  "effectiveTo": null
}
```

### GET `/api/supervisor/staff-members/{id}/history`

Feedbacks agregados + incidencias vinculadas (sin PII huésped).

---

## Comentarios textuales (moderación)

### GET `/api/supervisor/feedback-comments`

Auth: supervisor (depto), manager, admin.

```json
{
  "items": [
    {
      "feedbackId": "uuid",
      "rating": 2,
      "comment": "Demora en el servicio",
      "staffMemberDisplayName": "Juan P.",
      "departmentName": "F&B",
      "createdAt": "2026-06-09T20:00:00.000Z",
      "moderationFlag": false
    }
  ]
}
```

Staff operativo **no** tiene acceso (matriz Q2=B).