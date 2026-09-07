/* ============================================================
   AEROSCAN-3D — 3D Spatial Intelligence Viewer (Screen 5 — Dev 4 Stub)
   Ready for Dev 4 to mount Three.js / WebGL Gaussian Splat Scene.
   ============================================================ */

import { getRouteParams } from '../utils/router.js';
import { getAppState } from '../utils/appState.js';

export function renderViewer() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1300px; margin: 0 auto; width: 100%;';

  const params = getRouteParams();
  const state = getAppState();
  const targetMission = params.missionId || state.metadata?.name || 'MSN-7091 (Active)';

  page.innerHTML = `
    <!-- Top Bar -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
      <div>
        <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">SPATIAL INTELLIGENCE · DEV 4 INTERFACE</div>
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">3D Model & Radiance Field Viewer</h2>
      </div>
      <div style="display: flex; gap: 8px;">
        <span class="micro-label" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); padding: 4px 10px; border-radius: 4px;">
          TARGET: ${targetMission}
        </span>
      </div>
    </div>

    <!-- Viewer Stub Canvas Container -->
    <div class="page-placeholder" style="min-height: 520px; position: relative; background: #0c0c10;">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent); margin-bottom: 8px;">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
      </svg>
      <div style="font-weight: 700; color: #ffffff;">Three.js 3D Gaussian Splat Viewer — Reserved for Developer 4</div>
      <div class="micro-label" style="color: var(--color-text-muted);">
        CANVAS CONTAINER READY FOR WEBGL / THREE.JS MOUNTING (#/viewer/:missionId)
      </div>
    </div>
  `;

  return page;
}
