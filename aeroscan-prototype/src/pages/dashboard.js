/* ============================================================
   AEROSCAN-3D — Mission Dashboard Registry (Screen 2 — Dev 2)
   - 4 animated stat counters (Total Missions, Models Generated,
     Avg Time, Accuracy) using animateCounter with Quart/Expo easing.
   - Quick action toolstrip: "+ New Mission", "Reports", "Calibrate".
   - Active Mission banner (if video loaded in appState).
   - Past Missions telemetry table with hardware metrics, RMSE,
     and "View Model" deep-link triggers.
   ============================================================ */

import { DASHBOARD_STATS, MISSIONS_HISTORY } from '../utils/constants.js';
import { getAppState } from '../utils/appState.js';
import { animateCounter } from '../utils/animations.js';
import { navigate } from '../utils/router.js';

export function renderDashboard() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1300px; margin: 0 auto; width: 100%;';

  const state = getAppState();

  page.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; flex-wrap: wrap; gap: 16px;">
      <div>
        <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">OPERATIONAL AIR-SPACE DASHBOARD</div>
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">Mission Control & Spatial Archive</h2>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px;">
          Telemetry logs, metric reconstruction benchmarks, and historical aerial survey registry.
        </p>
      </div>

      <!-- Quick Actions Toolstrip -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button class="btn btn-secondary btn-sm" id="btn-calibrate" title="Hardware IMU/Lens Calibration">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Calibrate Rig
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-reports" title="Export SITREP Report">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Reports
        </button>
        <button class="btn btn-primary btn-sm" id="btn-new-mission">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          + NEW MISSION
        </button>
      </div>
    </div>

    <!-- Active Mission Banner (Shown when video is loaded in appState) -->
    ${state.metadata ? `
      <div class="glass-panel" style="padding: 20px 24px; margin-bottom: 28px; border-left: 3px solid var(--color-accent); background: rgba(242, 183, 5, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="status-dot"></div>
            <div>
              <div class="micro-label" style="color: var(--color-accent);">ACTIVE INGESTION LOADED IN MEMORY</div>
              <div style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin-top: 2px;">
                ${state.metadata.name}
              </div>
              <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-text-secondary); margin-top: 2px;">
                ${state.metadata.resolution} · ${state.metadata.formattedDuration} · ${state.frames.length} Extracted Frames
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" id="active-edit-btn">INSPECT INGESTION</button>
            <button class="btn btn-primary btn-sm" id="active-run-btn">RUN PIPELINE &rarr;</button>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 4 Animated Stat Counter Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;" id="dashboard-stats-grid">
      <div class="glass-panel" style="padding: 22px 20px;">
        <div class="micro-label" style="color: var(--color-text-secondary); margin-bottom: 8px;">TOTAL FLIGHT MISSIONS</div>
        <div class="mono-number" id="stat-total-missions" style="font-size: 2.2rem; font-weight: 800; color: #ffffff;">0</div>
        <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 6px;">Single-pass aerial surveys recorded</div>
      </div>

      <div class="glass-panel" style="padding: 22px 20px;">
        <div class="micro-label" style="color: var(--color-text-secondary); margin-bottom: 8px;">3D MODELS GENERATED</div>
        <div class="mono-number" id="stat-models-generated" style="font-size: 2.2rem; font-weight: 800; color: var(--color-accent);">0</div>
        <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 6px;">Dense 3DGS & DSM datasets</div>
      </div>

      <div class="glass-panel" style="padding: 22px 20px;">
        <div class="micro-label" style="color: var(--color-text-secondary); margin-bottom: 8px;">AVG. RECON TIME</div>
        <div class="mono-number" id="stat-avg-time" style="font-size: 2.2rem; font-weight: 800; color: #ffffff;">0</div>
        <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 6px;">Touchdown to 3D radiance field</div>
      </div>

      <div class="glass-panel" style="padding: 22px 20px;">
        <div class="micro-label" style="color: var(--color-text-secondary); margin-bottom: 8px;">RECON ACCURACY (RMSE)</div>
        <div class="mono-number" id="stat-accuracy" style="font-size: 2.2rem; font-weight: 800; color: #22c55e;">0</div>
        <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 6px;">Georeferenced GTSAM spatial error</div>
      </div>
    </div>

    <!-- Past Missions Historical Telemetry Table -->
    <div class="glass-panel" style="overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--color-border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <div class="micro-label">PAST SURVEY TELEMETRY REGISTRY</div>
        <span class="micro-label" style="color: var(--color-text-muted);">SHOWING ${MISSIONS_HISTORY.length} RECENT SESSIONS</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
        <thead>
          <tr style="background: rgba(10, 10, 13, 0.6); border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text-secondary);">
            <th style="padding: 12px 18px;" class="micro-label">MISSION ID</th>
            <th style="padding: 12px 18px;" class="micro-label">SITE / TARGET SECTOR</th>
            <th style="padding: 12px 18px;" class="micro-label">CLASSIFICATION</th>
            <th style="padding: 12px 18px;" class="micro-label">SENSOR PLATFORM</th>
            <th style="padding: 12px 18px;" class="micro-label">RMSE ERROR</th>
            <th style="padding: 12px 18px;" class="micro-label">PROCESSING</th>
            <th style="padding: 12px 18px;" class="micro-label">INTELLIGENCE STATUS</th>
            <th style="padding: 12px 18px; text-align: right;" class="micro-label">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${MISSIONS_HISTORY.map(m => `
            <tr style="border-bottom: 1px solid var(--color-border-subtle); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: var(--color-accent); font-weight: 700;">${m.id}</td>
              <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">${m.siteName}</td>
              <td style="padding: 14px 18px; color: var(--color-text-secondary); font-size: 0.72rem; font-family: var(--font-mono);">${m.classification}</td>
              <td style="padding: 14px 18px; color: var(--color-text-secondary);">${m.sensorPlatform}</td>
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: #22c55e;">${m.rmseCm} cm</td>
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: var(--color-text-secondary);">${m.durationMin}m</td>
              <td style="padding: 14px 18px;">
                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2);">
                  <span style="display:inline-block; width:4px; height:4px; border-radius:50%; background:#22c55e;"></span>
                  ${m.status}
                </span>
              </td>
              <td style="padding: 14px 18px; text-align: right;">
                <button class="btn btn-secondary btn-sm btn-view-model" data-id="${m.id}" style="padding: 5px 10px; font-size: 0.72rem;">
                  VIEW MODEL &rarr;
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // --- Attach Handlers ---
  const newMissionBtn = page.querySelector('#btn-new-mission');
  if (newMissionBtn) newMissionBtn.addEventListener('click', () => navigate('/upload'));

  const activeEditBtn = page.querySelector('#active-edit-btn');
  if (activeEditBtn) activeEditBtn.addEventListener('click', () => navigate('/upload'));

  const activeRunBtn = page.querySelector('#active-run-btn');
  if (activeRunBtn) activeRunBtn.addEventListener('click', () => navigate('/pipeline'));

  // Table "View Model" buttons
  page.querySelectorAll('.btn-view-model').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      navigate(`/viewer/${id}`);
    });
  });

  // Visual modal feedback for quick actions
  const calibrateBtn = page.querySelector('#btn-calibrate');
  if (calibrateBtn) {
    calibrateBtn.addEventListener('click', () => {
      alert('Rig Telemetry Calibration: IMU 100Hz and Lens Distortion matrices verified. Ready for deployment.');
    });
  }

  const reportsBtn = page.querySelector('#btn-reports');
  if (reportsBtn) {
    reportsBtn.addEventListener('click', () => {
      alert('Operational SITREP summary compiled. 47 past missions archived across sectors.');
    });
  }

  // --- Trigger Stat Counter Count-up Animations ---
  requestAnimationFrame(() => {
    animateCounter(page.querySelector('#stat-total-missions'), 0, DASHBOARD_STATS.totalMissions, 1600);
    animateCounter(page.querySelector('#stat-models-generated'), 0, DASHBOARD_STATS.modelsGenerated, 1600);
    animateCounter(page.querySelector('#stat-avg-time'), 0, DASHBOARD_STATS.avgProcessingTimeMin, 1800, {
      decimals: 1, suffix: ' min'
    });
    animateCounter(page.querySelector('#stat-accuracy'), 0, DASHBOARD_STATS.avgAccuracyRmseCm, 1800, {
      decimals: 1, suffix: ' cm'
    });
  });

  return page;
}
