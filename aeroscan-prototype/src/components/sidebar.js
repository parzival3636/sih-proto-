/* ============================================================
   UNIPASS-3D — Sidebar Component
   Collapsible left sidebar with nav, VRAM indicator, branding
   ============================================================ */

import { createIcons, icons } from 'lucide';
import { BRAND, NAV_ITEMS } from '../utils/constants.js';
import { navigate, onRouteChange, getCurrentPath } from '../utils/router.js';

let isCollapsed = false;
let vramInterval = null;

/**
 * Get the Lucide icon name mapped from our nav config
 */
const iconMap = {
  'home': 'Home',
  'layout-dashboard': 'LayoutDashboard',
  'upload-cloud': 'UploadCloud',
  'cpu': 'Cpu',
  'box': 'Box',
};

/**
 * Create and mount the sidebar into the DOM
 */
export function initSidebar() {
  const app = document.getElementById('app');
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'app-sidebar';

  sidebar.innerHTML = `
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="sidebar-brand-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
          <line x1="12" y1="22" x2="12" y2="15.5"/>
          <polyline points="22 8.5 12 15.5 2 8.5"/>
          <polyline points="2 15.5 12 8.5 22 15.5"/>
          <line x1="12" y1="2" x2="12" y2="8.5"/>
        </svg>
      </div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">${BRAND.systemName}</div>
        <div class="sidebar-brand-team">${BRAND.teamName}</div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="sidebar-section-label">Navigation</div>
    <nav class="sidebar-nav" id="sidebar-nav">
      ${NAV_ITEMS.map(item => `
        <a href="${item.path}" class="sidebar-nav-item" data-path="${item.path}">
          <i data-lucide="${item.icon}"></i>
          <span class="sidebar-nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <!-- VRAM Status -->
    <div class="sidebar-footer">
      <div class="sidebar-vram" id="sidebar-vram">
        <div class="sidebar-vram-label">
          <span>GPU VRAM</span>
          <span id="vram-text">6.2 / 12 GB</span>
        </div>
        <div class="sidebar-vram-bar">
          <div class="sidebar-vram-fill" id="vram-fill" style="width: 52%"></div>
        </div>
      </div>

      <!-- Collapse Toggle -->
      <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
    </div>
  `;

  app.prepend(sidebar);

  // Initialize Lucide icons
  createIcons({ icons });

  // Setup nav click handlers (prevent default, use router)
  const navItems = sidebar.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.getAttribute('data-path');
      navigate(path.replace('#', ''));
    });
  });

  // Setup collapse toggle
  const toggleBtn = document.getElementById('sidebar-toggle');
  toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    document.getElementById('app').classList.toggle('sidebar-collapsed', isCollapsed);
  });

  // Listen for route changes to update active state
  onRouteChange(({ basePath }) => {
    updateActiveNav(basePath);
  });

  // Set initial active state
  updateActiveNav(getCurrentPath());

  // Start VRAM fluctuation
  startVramFluctuation();
}

/**
 * Update the active nav item based on current route
 */
function updateActiveNav(currentPath) {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    const itemPath = item.getAttribute('data-path');
    const isActive = itemPath === currentPath;
    item.classList.toggle('active', isActive);
  });
}

/**
 * Simulate VRAM usage fluctuation for cosmetic effect
 */
function startVramFluctuation() {
  const vramText = document.getElementById('vram-text');
  const vramFill = document.getElementById('vram-fill');

  if (!vramText || !vramFill) return;

  let baseUsage = 6.2; // GB

  vramInterval = setInterval(() => {
    // Random fluctuation ±0.4 GB around base
    const fluctuation = (Math.random() - 0.5) * 0.8;
    const usage = Math.max(3.8, Math.min(9.6, baseUsage + fluctuation));
    const percent = (usage / 12) * 100;

    vramText.textContent = `${usage.toFixed(1)} / 12 GB`;
    vramFill.style.width = `${percent.toFixed(1)}%`;

    // Slowly drift the base usage
    baseUsage += (Math.random() - 0.5) * 0.1;
    baseUsage = Math.max(5.0, Math.min(8.5, baseUsage));
  }, 2000);
}

/**
 * Cleanup sidebar intervals
 */
export function destroySidebar() {
  if (vramInterval) {
    clearInterval(vramInterval);
    vramInterval = null;
  }
}
