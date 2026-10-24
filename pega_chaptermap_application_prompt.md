# Role & Objective

You are a Principal Frontend Architect and Staff UI/UX Designer. Build a modern, local-first web application called **"ChapterMap"**—an interactive spatial canvas and infographic dashboard designed for a **Pega Chapter Lead** to visualize, manage, and track engineering teams, chapter members, their roles, the Pega applications they work on, and the business verticals they belong to.

The core architectural requirement is a **Local-First, Bidirectional Markdown Sync Engine**: the entire application state (vertical hierarchy, team rosters, Pega applications, and spatial canvas coordinates) must read from and write directly to a local `.md` (Markdown) file in the background using the browser's native **File System Access API**, ensuring 100% data portability and human readability when opened in Obsidian, VS Code, Notion, or Git.

---

## 1. Tech Stack & 2026 Industry Standards

- **Framework:** React 19 + TypeScript + Vite (Single-Page Local-First Architecture)
- **Styling & Design System:** Tailwind CSS v4 + `shadcn/ui` primitives + `lucide-react` icons + `framer-motion` for fluid layout transitions
- **Spatial Canvas & Infographic Engine:** `@xyflow/react` (React Flow v12+) configured with Excalidraw/Miro-like pan/zoom ergonomics, custom HTML/Tailwind Infographic Nodes, sub-flow container nodes (for Verticals), animated SVG edges, a mini-map, and one-click auto-layout via `elkjs` or `dagre`
- **State & Local Persistence:** `zustand` with custom persistence middleware that performs debounced (500ms) background writes to the linked local `.md` file handle (via `window.showOpenFilePicker` / `showSaveFilePicker`) and mirrors state to `IndexedDB` so work is never lost across refreshes
- **Markdown AST Serialization:** Deterministic Markdown parser and serializer that keeps the `.md` file clean and human-readable while storing canvas layout coordinates `(x, y)` inside unobtrusive HTML metadata comments

---

## 2. Domain Model (Pega Chapter Topology)

The application tracks three primary organizational layers plus cross-cutting filters:

### A. Business Verticals (Canvas Container Zones)
- **Examples:** *Digital*, *Technology*, *Retail Banking*, *Commercial*, *Customer Operations*
- **Properties:** Vertical ID, Name, Theme Accent Color, Canvas Position `(x, y)`, and Dimensions `(width, height)`

### B. Teams / Squads (Infographic Card Nodes)
- **Properties:**
  - **Team Name:** e.g., *OmniChannel Servicing*, *Sales Acceleration Pod*, *Core Decisioning Squad*
  - **Parent Vertical:** Linked to a Vertical container
  - **Pega Application:** e.g., *Customer Service*, *Sales Automation*, *Customer Decision Hub (CDH)*, *Client Onboarding*, *Core Foundation*
  - **UI / Platform Stack Tag:** e.g., *Constellation UI*, *DX API v2*, *Theme-Cosmos*, *Pega Infinity '25*
  - **Canvas Coordinates:** `(x, y)` position on the infinite canvas

### C. Chapter Members (Roster Items inside Team Cards)
- **Properties:**
  - **Name & Initials Avatar**
  - **Primary Discipline / Role:**
    - `Pega LSA` (Lead System Architect)
    - `Pega SSA` (Senior System Architect)
    - `Pega CSA` (System Architect)
    - `Frontend / Constellation` (React / DX API / Design System)
    - `Decisioning / CDH` (Next-Best-Action / AI Strategy)
    - `QA / Test Automation`
    - `BA / Product Owner`
  - **Allocation Percentage:** e.g., `100%` or `50%` (supports shared resources across multiple squads)

---

## 3. Bidirectional Markdown Schema (`chapter-topology.md`)

Whenever a user adds, edits, drags, or reorganizes nodes on the canvas, the app must automatically serialize the state into the local Markdown file using the following clean structure:

~~~markdown
# Pega Chapter Topology
<!-- meta: {"version": "2026.1", "lastUpdated": "2026-10-23T14:00:00Z", "zoom": 0.95} -->

## Vertical: Digital
<!-- vertical: {"id": "vert-digital", "x": 80, "y": 100, "color": "indigo"} -->

### Team: OmniChannel Servicing
<!-- team: {"id": "team-omni", "x": 120, "y": 180} -->
- **Pega Application:** Customer Service
- **Architecture:** Constellation UI / DX API v2
- **Members:**
  - Alice Rivera | Pega LSA | 100%
  - Marco Silva | Pega SSA | 100%
  - Elena Rostova | Frontend / Constellation | 50%
  - Priya Nair | Pega CSA | 100%

### Team: Digital Sales Velocity
<!-- team: {"id": "team-sales", "x": 520, "y": 180} -->
- **Pega Application:** Sales Automation
- **Architecture:** Constellation UI
- **Members:**
  - Elena Rostova | Frontend / Constellation | 50%
  - Jordan Lee | Pega SSA | 100%
  - Samira Khan | BA / Product Owner | 100%

## Vertical: Technology
<!-- vertical: {"id": "vert-tech", "x": 960, "y": 100, "color": "emerald"} -->

### Team: Core Decisioning & Next-Best-Action
<!-- team: {"id": "team-cdh", "x": 1000, "y": 180} -->
- **Pega Application:** Customer Decision Hub (CDH)
- **Architecture:** Pega Infinity '25
- **Members:**
  - David Kim | Decisioning / CDH | 100%
  - Viktor Petrov | Pega LSA | 100%
  - Lucas Meyer | QA / Test Automation | 100%
~~~

---

## 4. Core Features & User Experience

### 1. Interactive Spatial Infographic Canvas
- **Visual Grouping:** Render each **Vertical** as a labeled, color-tinted architectural zone on the canvas. Render **Teams** inside or connected to their Vertical as sleek, high-density infographic cards.
- **Rich Team Card Design:**
  - **Card Header:** Team Name, Vertical badge, and a prominent **Pega Application** pill badge with distinct semantic coloring (e.g., Blue for *Customer Service*, Violet for *Sales*, Emerald for *CDH*, Amber for *Onboarding*).
  - **Skill Composition Bar:** A slim horizontal stacked progress bar inside each card showing the ratio of `Pega Architects` vs. `Frontend` vs. `CDH/QA/BA` at a glance.
  - **Member Roster:** Clean list of members with color-coded role chips (`LSA` highlighted in gold/amber, `SSA` in sky blue, `Frontend` in cyan, etc.) and allocation badges (`50%`, `100%`).
  - **Shared Member Connectors:** When a chapter member is allocated across multiple teams (e.g., 50% on two squads), hovering over their name highlights all squads they support and draws a subtle animated dashed connection line between those cards.

### 2. Executive Spotlight & Filter HUD (Top Floating Bar)
- A glassmorphic floating header displaying live chapter KPIs:
  - Total Verticals | Total Squads | Total Chapter Headcount | Full-Time Equivalent (FTE) capacity
  - **Interactive Spotlight Filters:** Clicking a role badge (e.g., `Pega LSA` or `Frontend`) or a Pega Application badge (e.g., `Customer Service`) immediately spotlights matching teams/members on the canvas and dims non-matching nodes to 25% opacity so the Chapter Lead can spot staffing gaps instantly (e.g., *"Which squads don't have a Pega LSA or Frontend specialist?"*).

### 3. Local-First File Sync Bar & Live Markdown Drawer
- **File Sync Status Indicator (Top Right):**
  - Displays live connection status: `🟢 Auto-saving to: chapter-topology.md` (using the File System Access API).
  - Includes buttons for:
    1. **Link / Open Local `.md` File** (`showOpenFilePicker`)
    2. **Save New `.md` File** (`showSaveFilePicker`)
    3. **Download `.md` Snapshot** (standard browser download fallback for unsupported browsers)
    4. **Live Markdown Split-View Toggle**
- **Two-Way Live Markdown Drawer:** A collapsible right-hand code drawer where the user can inspect or directly edit the raw Markdown text and watch the infographic canvas update in real time.

### 4. Effortless Editing & Canvas Controls (Bottom Floating Dock)
- An Excalidraw/Figma-inspired bottom floating toolbar with:
  - `+ New Vertical`
  - `+ New Team / Squad`
  - `+ Assign Member`
  - `✨ Auto-Layout Canvas` (neatly arranges all Verticals and Teams into a clean grid)
  - `Zoom to Fit` & `Dark / Light Theme Toggle`
- Clicking any Team Card or Vertical opens a clean slide-over Inspector Drawer (`Sheet`) to add/remove members, change roles, switch Pega applications, or reassign verticals with zero friction.

---

## 5. Visual Polish & Initial State
- **Aesthetic Direction:** High-craft executive architecture tool (inspired by Linear, Raycast, and Excalidraw). Crisp slate/zinc surfaces, subtle dot-matrix canvas background, refined micro-borders, and high-contrast semantic role badges.
- **Pre-Populated Demo Data:** Initialize the application with realistic Pega Chapter data (3 Verticals: *Digital*, *Technology*, *Commercial*; 5 Squads across *Customer Service*, *Sales Automation*, and *CDH*; and 14 Chapter Members across *Pega LSA*, *SSA*, *CSA*, *Frontend*, and *CDH* roles) so the infographic canvas looks executive-ready on first load.