# PracticeMap (ChapterMap) — Practice, Architecture & Delivery Hub

**PracticeMap** is a local-first spatial canvas, architecture blueprint hub, and practice delivery planner designed for Engineering & Pega Chapter Leads to visualize, manage, and track engineering squads, chapter members, Pega application blueprints, architecture dependencies, and delivery roadmaps.

---

## Key Capabilities

### 1. Three Integrated Workspaces
- **Squads & Verticals Canvas**: Spatial React Flow canvas organizing engineering squads inside Business Vertical zones with live FTE capacity tracking, shared-member connectors, role & employment filters, and spotlight search.
- **Applications & Dependencies Canvas**: Interactive architecture blueprint graph showing Pega application inheritance (`Built-On` edges), modules/rulesets, workflows/case types, data entities, integrations, and consuming squads.
- **Practice Planner (Calendar & Roadmap)**: Split-view delivery workspace featuring a monthly interactive calendar (PTO, project milestones, chapter events, tasks) and a multi-horizon strategic roadmap (`Now`, `Next`, `Later`, `Exploring`) with a Gantt timeline.

### 2. Local-First Bidirectional Sync Engine (`.md` & `.xlsx`)
- **Zero Cloud Lock-In**: The entire workspace state reads from and writes directly to a local **Markdown (`.md`)** or **Excel Workbook (`.xlsx`)** file using the browser's native **File System Access API** (`window.showOpenFilePicker` / `window.showSaveFilePicker`).
- **Offline & Refresh Persistence**: State and file handles are mirrored to `IndexedDB` and `localStorage` with debounced background auto-save and automatic external file-change detection.
- **Live Source Inspector**: View and edit the underlying Markdown AST or multi-sheet Excel preview directly inside the collapsible right-hand drawer.

---

## Tech Stack

- **Framework**: React 19 + TypeScript 5.7 + Vite 6
- **Styling**: Tailwind CSS v4 + Lucide Icons (Dark & Light executive themes)
- **Spatial Canvas**: `@xyflow/react` (React Flow v12)
- **State & Persistence**: `zustand` + `idb-keyval` (IndexedDB) + File System Access API
- **Serialization Engines**: Deterministic Markdown AST parser/serializer & multi-sheet `xlsx` workbook engine

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20.0.0` (Node 22 LTS recommended — see `.nvmrc`)
- **npm** `>= 10.0.0`

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start the development server at http://localhost:5173
npm run dev
```

### Build & Verification Scripts

```bash
# Run TypeScript type checking
npm run typecheck

# Build optimized production bundle to ./dist
npm run build

# Preview production build locally
npm run preview
```

---

## Deployment

This project is pre-configured with relative asset paths (`base: './'`) and code-split vendor chunks in `vite.config.ts`, making `./dist` deployable to any static hosting provider without extra configuration:

- **GitHub Pages (Automated)**: A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included. In your GitHub repository, navigate to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Every push to `main` will automatically typecheck, build, and deploy.
- **Vercel / Netlify / Cloudflare Pages**: Import the GitHub repository with:
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Node.js Version**: `22.x`
