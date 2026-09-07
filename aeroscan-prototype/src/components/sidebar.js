/* ============================================================
   AEROSCAN-3D — Tactical Sidebar (Icon Rail)
   Reference: C2GRID navigation panel (#131317, 1px #26262c border,
   amber active state highlight, technical micro-copy, VRAM monitor).
   ============================================================ */

import { BRAND, HARDWARE_SPEC, NAV_ROUTES } from '../utils/constants.js';
import { navigate, onRouteChange, getCurrentPath } from '../utils/router.js';

let isCollapsed = false;
let vramTimer = null;

// Clean vector icons
const icons = {
  compass: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  'layout-grid': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  'upload-cloud': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  box: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  collapse: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
};

/**
 * Initialize and mount the tactical sidebar
 */
export function initSidebar() {
  const app = document.getElementById('app');
  if (!app) return;

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'app-sidebar';

  sidebar.innerHTML = `
    <!-- Top Brand Area -->
    <div class="sidebar-top">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2b705" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
      <span class="sidebar-brand-name">${BRAND.systemName}</span>
    </div>

    <!-- Navigation List -->
    <nav class="sidebar-nav">
      ${NAV_ROUTES.map(item => `
        <a href="${item.path}" class="sidebar-item" data-path="${item.path}">
          <span class="sidebar-icon">${icons[item.icon] || ''}</span>
          <span class="sidebar-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <!-- Bottom System Status (GPU Hardware Monitor) -->
    <div class="sidebar-bottom">
      <div class="sidebar-system-status">
        <div class="system-status-header">
          <span class="micro-label" style="font-size: 0.65rem;">RIG TELEMETRY</span>
          <span class="status-dot" title="GPU Engine Ready"></span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-secondary); font-family: var(--font-mono);">
          <span>VRAM</span>
          <span id="vram-val" class="mono-number">5.8 / 24.0 GB</span>
        </div>
        <div class="vram-progress-track">
          <div class="vram-progress-fill" id="vram-bar" style="width: 24%"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--color-text-muted); margin-top: 2px;">
          <span>RTX 4090</span>
          <span>CUDA 12.4</span>
        </div>
      </div>

      <!-- Collapse Toggle -->
      <button class="sidebar-collapse-toggle" id="sidebar-toggle" title="Toggle Rail">
        ${icons.collapse}
      </button>
    </div>
  `;

  app.prepend(sidebar);

  // Setup navigation click handlers
  const links = sidebar.querySelectorAll('.sidebar-item');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.getAttribute('data-path');
      navigate(path);
    });
  });

  // Toggle button
  const toggleBtn = document.getElementById('sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    app.classList.toggle('sidebar-collapsed', isCollapsed);
    toggleBtn.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  // Route update listener
  onRouteChange(({ path }) => {
    updateActiveNav(path);
  });

  updateActiveNav(getCurrentPath());
  startVramMonitor();
}

/**
 * Update highlighted active state
 */
function updateActiveNav(activePath) {
  const items = document.querySelectorAll('.sidebar-item');
  items.forEach(item => {
    const itemPath = item.getAttribute('data-path');
    item.classList.toggle('active', itemPath === activePath);
  });
}

/**
 * Real-time realistic hardware telemetry fluctuation
 */
function startVramMonitor() {
  const vramVal = document.getElementById('vram-val');
  const vramBar = document.getElementById('vram-bar');
  if (!vramVal || !vramBar) return;

  let currentVram = HARDWARE_SPEC.vramBaselineUsageGb;

  vramTimer = setInterval(() => {
    // Subtle realistic fluctuation ±0.3 GB
    const delta = (Math.random() - 0.5) * 0.4;
    currentVram = Math.max(5.2, Math.min(8.4, currentVram + delta));
    const percent = Math.round((currentVram / HARDWARE_SPEC.vramTotalGb) * 100);

    vramVal.textContent = `${currentVram.toFixed(1)} / ${HARDWARE_SPEC.vramTotalGb.toFixed(1)} GB`;
    vramBar.style.width = `${percent}%`;
  }, 2400);
}

export function destroySidebar() {
  if (vramTimer) clearInterval(vramTimer);
}
