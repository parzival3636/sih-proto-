/* ============================================================
   AEROSCAN-3D — Mission Dashboard Registry (Screen 2 — Dev 2)
   Displays past survey telemetry and ingested active mission.
   ============================================================ */

import { MISSIONS_HISTORY } from '../utils/constants.js';
import { getAppState } from '../utils/appState.js';
import { navigate } from '../utils/router.js';

export function renderDashboard() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1300px; margin: 0 auto; width: 100%;';

  const state = getAppState();

  page.innerHTML = `
    <!-- Top Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
      <div>
        <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">MISSION REGISTRY & SPATIAL ARCHIVE</div>
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">Operational Flights</h2>
      </div>
      <button class="btn btn-primary btn-sm" id="dash-new-mission">
        + INGEST NEW FLIGHT
      </button>
    </div>

    <!-- Active Mission Status (if video is ingested in appState) -->
    ${state.metadata ? `
      <div class="glass-panel" style="padding: 20px 24px; margin-bottom: 28px; border-color: var(--color-accent);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="status-dot"></div>
            <div>
              <div class="micro-label" style="color: var(--color-accent);">ACTIVE INGESTION LOADED IN APPSTATE</div>
              <div style="font-size: 1rem; font-weight: 700; color: #fff;">${state.metadata.name}</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: center; font-family: var(--font-mono); font-size: 0.75rem;">
            <span>${state.metadata.resolution}</span>
            <span>${state.metadata.formattedSize}</span>
            <button class="btn btn-secondary btn-sm" id="dash-view-active">INSPECT PIPELINE &rarr;</button>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Missions Historical Telemetry Table -->
    <div class="glass-panel" style="overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
        <thead>
          <tr style="background: rgba(10, 10, 13, 0.6); border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text-secondary);">
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">MISSION ID</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">SITE / TARGET</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">CLASSIFICATION</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">PLATFORM</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">RMSE (cm)</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">TIME</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">STATUS</th>
            <th style="padding: 12px 18px; font-weight: 600;" class="micro-label">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${MISSIONS_HISTORY.map(m => `
            <tr style="border-bottom: 1px solid var(--color-border-subtle); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: var(--color-accent);">${m.id}</td>
              <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">${m.siteName}</td>
              <td style="padding: 14px 18px; color: var(--color-text-secondary); font-size: 0.72rem; font-family: var(--font-mono);">${m.classification}</td>
              <td style="padding: 14px 18px; color: var(--color-text-secondary);">${m.sensorPlatform}</td>
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: #22c55e;">${m.rmseCm} cm</td>
              <td style="padding: 14px 18px; font-family: var(--font-mono); color: var(--color-text-secondary);">${m.durationMin}m</td>
              <td style="padding: 14px 18px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2);">
                  ${m.status}
                </span>
              </td>
              <td style="padding: 14px 18px;">
                <button class="btn btn-secondary btn-sm" onclick="location.hash='#/viewer/${m.id}'" style="padding: 4px 8px; font-size: 0.7rem;">
                  VIEW 3D &rarr;
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const newBtn = page.querySelector('#dash-new-mission');
  if (newBtn) newBtn.addEventListener('click', () => navigate('/upload'));

  const activeBtn = page.querySelector('#dash-view-active');
  if (activeBtn) activeBtn.addEventListener('click', () => navigate('/pipeline'));

  return page;
}
