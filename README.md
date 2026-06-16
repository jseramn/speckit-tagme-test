# TagMe Codebase Dashboard

Este repo contiene una app desplegable del dashboard de Understand Anything para visualizar el knowledge graph generado del proyecto `speckit-tagme-test`.

La app lista para Vercel vive en:

```text
understand-dashboard/
```

El grafo incluido para el deploy esta en:

```text
understand-dashboard/packages/dashboard/public/knowledge-graph.json
```

## Correr el dashboard localmente

```bash
cd understand-dashboard
npm install
npm run dev
```

## Compilar

```bash
cd understand-dashboard
npm run build
```

El output estatico queda en:

```text
understand-dashboard/packages/dashboard/dist
```

## Actualizar el grafo

Cuando vuelvas a correr `/understand`, copia el grafo actualizado:

```powershell
Copy-Item .understand-anything\knowledge-graph.json understand-dashboard\packages\dashboard\public\knowledge-graph.json -Force
```

Luego recompila:

```bash
cd understand-dashboard
npm run build
```

## Deploy manual en Vercel

1. Sube la rama `dashboard-codebase` a GitHub.
2. En Vercel, crea un proyecto nuevo desde ese repo.
3. En **Root Directory**, selecciona `understand-dashboard`.
4. Usa la configuracion de `understand-dashboard/vercel.json`:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `packages/dashboard/dist`
5. Haz deploy.

No se necesitan variables de entorno para este dashboard estatico.
