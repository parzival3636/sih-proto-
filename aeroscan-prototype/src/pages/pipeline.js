/* ============================================================
   AEROSCAN-3D — Pipeline Processing Visualizer (Screen 4 — Dev 3 Stub)
   Ready for Dev 3 to attach the animated 5-stage reconstruction.
   ============================================================ */

import { getAppState } from '../utils/appState.js';

export function renderPipeline() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1300px; margin: 0 auto; width: 100%;';

  const state = getAppState();

  page.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">RECONSTRUCTION PIPELINE · DEV 3 INTERFACE</div>
      <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">5-Phase Offline Compute Engine</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px;">
        Video & Pose Estimation &rarr; Monocular Depth &rarr; 3D Gaussian Splatting &rarr; GTSAM/iSAM2 Georeferencing
      </p>
    </div>

    ${state.metadata ? `
      <div class="glass-panel" style="padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="micro-label" style="color: var(--color-observed);">ACTIVE INGEST STREAM DETECTED:</span>
          <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-top: 2px;">${state.metadata.name} (${state.metadata.resolution} · ${state.metadata.formattedDuration})</div>
        </div>
        <div class="mono-number" style="font-size: 0.8rem; color: var(--color-accent);">
          ${state.frames.length} REAL FRAMES READY FOR CUDA ACCELERATION
        </div>
      </div>
    ` : ''}

    <div class="page-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent); margin-bottom: 8px;">
        <rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
      </svg>
      <div style="font-weight: 700; color: #ffffff;">Pipeline Processing Visualizer — Reserved for Developer 3</div>
      <div class="micro-label" style="color: var(--color-text-muted);">
        CONSUMES REAL VIDEO AND EXTRACTED FRAMES FROM APPSTATE
      </div>
    </div>
  `;

  return page;
}
