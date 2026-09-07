# Antigravity Build Prompt — Dev 1: Foundation, Design System, Router & Landing Page
### Project: UNIPASS-3D ("AeroScan3D" Prototype) — Team Defaulters — Smart India Hackathon 2026

---

## HOW TO USE THIS PROMPT
Paste everything below the divider into Antigravity as a single task. It is scoped ONLY to Developer 1's files, so the agent will not touch any other teammate's pages. Do not let the agent create or edit files outside the "Files You Own" list.

---

## 1. PROJECT CONTEXT (give the agent full situational awareness)

We are Team Defaulters, building **UNIPASS-3D**, a single-pass aerial 3D reconstruction system for rapid situational awareness (disaster response / infrastructure inspection). The real pipeline uses a drone flying a single pass (no repeat flights, no ground markers), fuses GPS/IMU with monocular depth and pose estimation (Depth Anything V2, DROID-SLAM, MASt3R, MonST3R, 3D Gaussian Splatting, GTSAM/iSAM2) to produce a metric, georeferenced 3D model in ~15–20 minutes, with every surface trust-tagged as **Observed**, **Inferred**, or **AI-Completed**.

Because the hackathon team does not have the GPU hardware to run this pipeline live, **we are building a fully hardcoded frontend simulation**: a polished single-page web app that *looks and behaves* like the real system end-to-end — accurate parameter names, accurate stage timings, accurate metric ranges, realistic canvas/WebGL visualizations — driven entirely by mock data and scripted animations rather than a live backend.

The real system architecture (for accurate terminology/labels only, not implementation) has 5 phases:
1. **Drone Data Acquisition** — 4K/1080p video, GPS 1Hz, IMU 100Hz, metadata
2. **Video & Camera Pose** — FFmpeg frame extraction, MASt3R/DROID-SLAM pose estimation, refined camera trajectory
3. **Depth & Dynamic Scene** — Depth Anything V2 monocular depth, MonST3R + SAM2 dynamic object masking, multi-view geometry + GPS/altitude fusion for scale-aware depth
4. **3D Reconstruction** — 3D Gaussian Splatting + CUDA, producing point cloud, textured mesh, 3DGS scene, orthophoto, DSM
5. **Georeferencing & Completion** — GTSAM/iSAM2 optimization, confidence/trust tagging, dynamic-aware coverage, metric georeferenced model

Outputs: Point Cloud (LAS/LAZ), Textured Mesh (OBJ/glTF), 3D Gaussian Splat scene (glTF/KHR_gaussian_splatting), Orthophoto (GeoTIFF), DSM (GeoTIFF), Confidence/Trust map. Interactive web viewer: React + Three.js + WebGL, with explore/measure/annotate/export capability.

The team has divided the app into 5 screens across 4 developers:
- **Dev 1 (ME — this prompt):** App shell, design system, router, landing page, sidebar, header
- Dev 2: Dashboard (Screen 2) + Mission Upload (Screen 3)
- Dev 3: Pipeline Processing Visualizer (Screen 4) — the 5-stage animated "star" screen
- Dev 4: Three.js 3D Model Viewer (Screen 5)

**I am Developer 1.** Build ONLY my scope. Other developers' pages (`dashboard.js`, `upload.js`, `pipeline.js`, `viewer.js`) should be created only as *empty placeholder stubs* that the router can safely link to (so the app doesn't crash when navigated to), not fully implemented.

---

## 2. TECH STACK & PROJECT SETUP

- Build tool: **Vite** (`vanilla` JS template — no framework, no build-step frameworks like React for this shell; teammates will each export a `render*()` function returning a DOM element/HTML string per the team's file-ownership plan).
- Plain JavaScript (ES modules), plain CSS (no Tailwind, no CSS framework) — we need full control of the custom aerospace/glassmorphic look.
- `three` and `lucide` should be added as dependencies (Dev 4 needs `three`; icons via `lucide`).
- Hash-based client-side routing (no server, no history API dependency) so it works from a static file/GitHub Pages/local demo without a backend.
- No TypeScript. No React. Keep dependencies minimal — this must run reliably on a laptop during a live judged demo with no internet dependency beyond initial `npm install`.

Run:
```bash
npm create vite@latest aeroscan-prototype -- --template vanilla
cd aeroscan-prototype
npm install three lucide
```

---

## 3. FILES YOU OWN (create/edit ONLY these)

```
index.html
src/main.js
src/styles/index.css
src/utils/constants.js
src/utils/router.js
src/utils/animations.js
src/components/sidebar.js
src/components/header.js
src/pages/landing.js
```

Also create empty stub files (placeholder only, one line each) so routing doesn't break:
```
src/pages/dashboard.js   -> export function renderDashboard(){ return el('<div class="page-placeholder">Dashboard — Dev 2</div>') }
src/pages/upload.js      -> export function renderUpload(){ return el('<div class="page-placeholder">Upload — Dev 2</div>') }
src/pages/pipeline.js    -> export function renderPipeline(){ return el('<div class="page-placeholder">Pipeline — Dev 3</div>') }
src/pages/viewer.js      -> export function renderViewer(){ return el('<div class="page-placeholder">3D Viewer — Dev 4</div>') }
```
(These four files will be fully overwritten by teammates later — keep them minimal so there's nothing to merge-conflict over.)

---

## 4. DESIGN SYSTEM — `src/styles/index.css`

Reference aesthetic: dark aerospace / mission-control UI, similar to DJI Terra and geospatial GIS dashboards — deep near-black navy background, glassmorphic cards, glowing cyan accent lines (used for flight paths / active states), and a **trust-tag color language** that must be used consistently everywhere in the app (all teammates will reuse these CSS variables):

- `--color-observed` → green (directly measured/reconstructed data, high confidence)
- `--color-inferred` → amber/yellow (estimated via model fusion, medium confidence)
- `--color-ai-completed` → orange/red-orange (fully AI-hallucinated gap-fill, lowest confidence)
- `--color-accent-cyan` → primary interactive accent (flight paths, active nav, links, buttons)
- `--color-bg-primary` → near-black navy (e.g. `#0a0e14`)
- `--color-bg-surface` → slightly lighter panel background with translucency for glass cards
- `--color-bg-elevated` → for modals/dropdowns
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-border-subtle` → thin 1px hairline borders on glass cards
- `--color-danger`, `--color-success`, `--color-warning`

Define ALL colors, spacing (4px/8px scale), border-radius, and font-family as CSS custom properties on `:root` so every teammate's page pulls from the same tokens — this is the single most important deliverable since it prevents 4 developers from producing 4 different-looking pages.

Required reusable component classes:
- `.glass-card` — translucent background, backdrop-filter blur, subtle border, soft shadow
- `.glow-border` / `.glow-text` — cyan glow effect (box-shadow / text-shadow) used on active/highlighted elements
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.stat-counter` — large glowing number + small label, used for animated counters
- `.badge` with modifier classes `.badge-observed`, `.badge-inferred`, `.badge-ai-completed` (pill-shaped trust tags, reusable by Dev 4's overlays and Dev 3's pipeline stage indicators)
- `.terminal-text` — monospace, small, green-on-black style for any log/console displays (Dev 3 will extend this)
- `.page-placeholder` — centered, muted, dashed-border box for the stub pages above
- Skeleton shimmer keyframes (`@keyframes shimmer`) for loading states
- Responsive breakpoints: collapse sidebar under 1024px

Typography: a technical/monospace font (e.g. `'JetBrains Mono', 'IBM Plex Mono', monospace`) for data/numbers/labels, and a clean sans-serif (e.g. `'Inter', system-ui`) for body copy/headings. Load via Google Fonts `<link>` in `index.html` or `@font-face` if offline demo is required — prefer self-hosted or system fallback since the hackathon demo may have no internet.

---

## 5. SHARED MOCK DATA — `src/utils/constants.js`

This is the single source of truth every teammate imports from. Populate it with **realistic, internally-consistent** values so all screens tell the same coherent story. Include:

```js
export const BRAND = {
  systemName: 'UNIPASS-3D',
  tagline: 'Single-Pass Aerial 3D Reconstruction for Rapid Situational Awareness',
  teamName: 'Team Defaulters',
  event: 'Smart India Hackathon 2026',
};

export const TRUST_TAGS = ['Observed', 'Inferred', 'AI-Completed'];

export const PIPELINE_PHASES = [
  { id: 1, name: 'Flight & Capture', desc: 'One low pass. Single-pass mission captures video, GPS, and IMU data.' },
  { id: 2, name: 'Data Transfer', desc: 'Landing to processing, instantly. Footage moves offline to rig — no cloud needed.' },
  { id: 3, name: 'Reconstruction Engine', desc: 'Raw footage becomes real geometry: motion, depth, and structure inferred frame-by-frame, fully offline.' },
  { id: 4, name: 'Trust-Tagged Output', desc: 'Nothing hidden, assumed. Every surface marked Observed, Inferred, or AI-Completed.' },
  { id: 5, name: 'Field Review & Decision', desc: 'Footage to decision, in minutes. Operator measures and verifies the model on-site.' },
  { id: 6, name: 'Reporting & Archival', desc: 'The mission ends, the record doesn\u2019t. Outputs saved locally, shared when connectivity returns.' },
];

export const PROCESSING_STAGES = [
  { id: 1, name: 'Video Preparation', durationSec: 8,  totalFrames: 8160 },
  { id: 2, name: 'Pose Estimation',   durationSec: 10, reprojErrorStart: 4.2, reprojErrorEnd: 0.31 },
  { id: 3, name: 'Depth Estimation',  durationSec: 8 },
  { id: 4, name: '3D Reconstruction', durationSec: 12, gaussiansEnd: 8300000, psnrStart: 18.2, psnrEnd: 31.4 },
  { id: 5, name: 'Georeferencing',    durationSec: 5,  rmseCm: 2.3 },
];

export const TECH_STACK = ['PyTorch','OpenCV','Docker','CloudCompare','NVIDIA CUDA','Open3D','FFmpeg','three.js','FastAPI'];

export const RESEARCH_MODELS = ['Depth Anything V2','DROID-SLAM','MASt3R','MonST3R','3D Gaussian Splatting','GTSAM/iSAM2','LaMa + Diffusion','SAM2'];

export const MISSIONS = [
  // 6-10 realistic mock rows: id, siteName, date, droneModel, frameCount, rmseCm, processingTimeMin, status, thumbnailUrl
];

export const DASHBOARD_STATS = {
  totalMissions: 0,      // fill with plausible demo numbers
  modelsGenerated: 0,
  avgProcessingTimeMin: 0,
  avgAccuracyRmseCm: 0,
};

export const OUTPUT_FORMATS = ['Point Cloud (LAS/LAZ)','Textured Mesh (glTF/OBJ)','3D Gaussian Splat (glTF)','Orthophoto (GeoTIFF)','DSM (GeoTIFF)','Inspection PDF'];
```

Fill in the placeholder numeric fields yourself with plausible, internally consistent demo values (e.g. drawing on the reference numbers already given: 8,160 frames, 4.2px → 0.31px reprojection error, 8.3M Gaussians, 18.2 → 31.4dB PSNR, 2.3cm RMSE, ~15–20 min total processing). Add 6–10 mock past missions with varied site names relevant to disaster/infrastructure use cases (e.g. landslide survey, bridge inspection, flood-zone mapping, construction site, powerline corridor, coastal erosion site).

---

## 6. ROUTER — `src/utils/router.js`

- Hash-based SPA router supporting exactly these routes:
  - `#/` → landing (Dev 1)
  - `#/dashboard` → dashboard (Dev 2)
  - `#/upload` → upload (Dev 2)
  - `#/pipeline` → pipeline (Dev 3)
  - `#/viewer` → viewer (Dev 4)
- On `hashchange` and on initial load, look up the route, call the matching page's `render*()` function, and mount the returned DOM node into a single `#app-content` container (leave the persistent sidebar/header outside this container so they don't remount on every navigation).
- Support an optional route param pattern for the viewer, e.g. `#/viewer/:missionId`, so Dev 2's "View Model" buttons can deep-link to a specific mission (parse and expose `getRouteParams()`).
- Export a small `navigate(path)` helper so any page can programmatically redirect (e.g. Upload page's "Begin Processing →" button navigating to `#/pipeline`).
- Highlight the active nav item in the sidebar based on current route.
- Do a simple 404/fallback back to `#/` if an unknown hash is entered.

---

## 7. ANIMATION UTILITIES — `src/utils/animations.js`

- `animateCounter(el, from, to, durationMs, { decimals = 0, easing = 'easeOutExpo' } = {})` — animates a number counting up inside `el.textContent`, using `requestAnimationFrame`, with an ease-out curve (fast start, slow settle) so stat cards feel alive. Must support decimals (for RMSE like `2.3cm`) and large numbers with comma formatting (for frame/Gaussian counts).
- `shimmer(el)` — applies/removes the shimmer loading class, for use as a skeleton-loading placeholder anywhere in the app before content settles in.
- Keep this file dependency-free (no animation libraries) — pure JS + rAF, since Dev 3 will heavily reuse `animateCounter` for pipeline metrics and Dev 2 will use it for dashboard stats.

---

## 8. SIDEBAR — `src/components/sidebar.js`

- Collapsible left sidebar (icon-only collapsed state ↔ full labeled expanded state), persists collapsed/expanded state in memory for the session.
- Nav items linking to the 5 routes, using `lucide` icons (e.g. Home, LayoutDashboard, UploadCloud, Cpu/Activity for pipeline, Box for 3D viewer).
- Active route gets the cyan glow/highlight treatment.
- Bottom of sidebar: a "System VRAM Status" mock bar — a labeled progress bar showing fake but plausible GPU memory usage (e.g. `6.2 GB / 12 GB`) that subtly fluctuates over time via `setInterval`, purely cosmetic, to sell the "real system" feel.
- Include the `UNIPASS-3D` wordmark/logo and `Team Defaulters` label at the top.

---

## 9. HEADER — `src/components/header.js`

- Top bar with: breadcrumb reflecting current route (e.g. "Home / Mission Dashboard"), and right-aligned action buttons (e.g. notification bell icon, user/profile avatar placeholder, a "New Mission" primary button).
- Should re-render its breadcrumb on every route change (expose an `updateHeader(routeName)` function the router calls).
- Sticky to top, glass-card style consistent with the design system.

---

## 10. LANDING PAGE — `src/pages/landing.js` (Screen 1)

This is the hackathon judges' first impression — make it visually striking and information-dense but not cluttered:

1. **Hero section**: `UNIPASS-3D` wordmark, tagline ("Single-Pass Aerial 3D Reconstruction for Rapid Situational Awareness"), a one-line problem framing ("One pass, real-world chaos, and a deadline that can't wait"), an "SIH 2026" badge, and a "Launch Mission Console →" CTA button that navigates to `#/dashboard`. Include a subtle animated background (e.g. faint drifting grid lines or particles suggestive of terrain/point-cloud data — CSS/canvas only, keep it lightweight).
2. **Animated stat counters row** (reuse `animateCounter`): e.g. "~15–20 min processing time", "2.3cm RMSE accuracy", "8.3M Gaussians reconstructed", "Zero repeat flights" — trigger the count-up animation via an `IntersectionObserver` when the section scrolls into view.
3. **Feature grid** mapped to the 5 real system phases (Drone Data Acquisition → Video & Camera Pose → Depth & Dynamic Scene → 3D Reconstruction → Georeferencing & Completion), each as a glass card with an icon, phase name, and 1-sentence description pulled from `PIPELINE_PHASES`/architecture context above.
4. **"Why UNIPASS-3D" comparison strip**: short "old way vs our way" contrast (e.g. "80% overlap, hours of flight time" vs "one low pass, ~15–20 min offline"), styled as two contrasting glass cards.
5. **Trust-tagging explainer strip**: 3 small badges (Observed / Inferred / AI-Completed) with a one-line explanation each, using the `.badge-*` classes from the design system — this concept reappears on Dev 4's viewer, so introduce it clearly here.
6. Footer: team name, hackathon name, tech stack logos/names pulled from `TECH_STACK`.

All copy should read like a polished product landing page, not raw bullet points from a slide deck — rewrite the poster content into flowing marketing-style microcopy.

---

## 11. ACCEPTANCE CRITERIA

- `npm run dev` boots cleanly with zero console errors.
- Navigating between all 5 hash routes works, sidebar highlights the correct active item, header breadcrumb updates.
- Landing page counters animate once when scrolled into view (not on every scroll).
- Sidebar VRAM bar animates subtly and continuously.
- All colors/spacing/fonts come from CSS variables in `index.css` — no hardcoded hex colors inside page/component JS files.
- Stub pages for dashboard/upload/pipeline/viewer render without throwing, so teammates can merge their real implementations later with zero router changes needed.
- Fully responsive down to a 1024px laptop demo resolution at minimum (mobile support is a nice-to-have, not required for hackathon judging).
- No external CDN dependency required at runtime beyond what's bundled by Vite (offline-safe for the live demo).

---

## 12. WHAT NOT TO DO

- Do not implement any real video/pose/depth/reconstruction processing — this is a scripted, hardcoded frontend simulation only, per project scope.
- Do not touch `dashboard.js`, `upload.js`, `pipeline.js`, or `viewer.js` beyond the one-line stub — those belong to Devs 2, 3, and 4.
- Do not introduce a UI framework (React/Vue/Svelte) — vanilla JS only, per the team's shared architecture.
- Do not invent new routes or rename existing ones — the exact 5 hash routes above are load-bearing for the rest of the team's branches.
