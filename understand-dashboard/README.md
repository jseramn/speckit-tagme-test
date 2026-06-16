# TagMe Understand Anything Dashboard

Standalone Vite app for the Understand Anything knowledge graph generated from this repository.

The deployed dashboard reads the static graph at `packages/dashboard/public/knowledge-graph.json`. It does not require the local Understand Anything plugin, `GRAPH_DIR`, or a runtime token in Vercel.

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production Build

```bash
npm run build
npm run preview
```

The static output is generated at `packages/dashboard/dist`.

## Update The Graph

From the repository root:

```bash
copy .understand-anything\knowledge-graph.json understand-dashboard\packages\dashboard\public\knowledge-graph.json
```

Then rebuild:

```bash
cd understand-dashboard
npm run build
```

## Deploy On Vercel

1. Push the `dashboard-codebase` branch to GitHub.
2. In Vercel, create a new project from the repository.
3. Set **Root Directory** to `understand-dashboard`.
4. Keep the build settings from `vercel.json`:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `packages/dashboard/dist`
5. Deploy.

No environment variables are required for the static dashboard.
