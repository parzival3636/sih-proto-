/* ============================================================
   AEROSCAN-3D — Slim Tactical Top Header
   Reference: C2GRID minimal top navigation (Dark background,
   stage breadcrumb, system status, amber primary CTA).
   ============================================================ */

import { BRAND } from '../utils/constants.js';
import { onRouteChange, navigate } from '../utils/router.js';

let breadcrumbContainer = null;

/**
 * Initialize and mount the tactical header
 */
export function initHeader() {
  const appMain = document.querySelector('.app-main');
  if (!appMain) return;

  const header = document.createElement('header');
  header.className = 'app-header';
  header.id = 'app-header';

  header.innerHTML = `
    <div class="header-left">
      <div class="header-logo-text">
        <span>${BRAND.systemName}</span>
        <span class="header-logo-badge">SIH 2026</span>
      </div>

      <div class="header-breadcrumb" id="header-breadcrumb">
        <span class="micro-label">PIPELINE:</span>
        <span class="header-breadcrumb-item" data-stage="upload">1. INGEST</span>
        <span style="color: var(--color-border-subtle)">/</span>
        <span class="header-breadcrumb-item" data-stage="pipeline">2. RECONSTRUCT</span>
        <span style="color: var(--color-border-subtle)">/</span>
        <span class="header-breadcrumb-item" data-stage="viewer">3. SPATIAL 3D</span>
      </div>
    </div>

    <div class="header-right">
      <div class="header-nav-links">
        <a href="#/dashboard" class="header-nav-link">Missions</a>
        <a href="#/" class="header-nav-link">Protocol Spec</a>
      </div>

      <button class="btn btn-primary btn-sm" id="header-new-mission-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        NEW MISSION
      </button>
    </div>
  `;

  appMain.prepend(header);
  breadcrumbContainer = document.getElementById('header-breadcrumb');

  // Handle CTA click
  const ctaBtn = document.getElementById('header-new-mission-btn');
  ctaBtn.addEventListener('click', () => {
    navigate('/upload');
  });

  // Handle stage breadcrumb updates
  onRouteChange(({ path }) => {
    updateBreadcrumbs(path);
  });

  updateBreadcrumbs(window.location.hash || '#/');
}

/**
 * Highlight active pipeline stage in the header breadcrumb
 */
function updateBreadcrumbs(path) {
  if (!breadcrumbContainer) return;
  const items = breadcrumbContainer.querySelectorAll('.header-breadcrumb-item');

  items.forEach(item => {
    const stage = item.getAttribute('data-stage');
    if (path.includes(stage)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
