/* ============================================================
   UNIPASS-3D — Header Component
   Sticky top bar with breadcrumb & action buttons
   ============================================================ */

import { createIcons, icons } from 'lucide';
import { onRouteChange, navigate } from '../utils/router.js';

let headerEl = null;
let breadcrumbEl = null;

/**
 * Create and mount the header into the app-main container
 */
export function initHeader() {
  const appMain = document.querySelector('.app-main');
  if (!appMain) return;

  headerEl = document.createElement('header');
  headerEl.className = 'header';
  headerEl.id = 'app-header';

  headerEl.innerHTML = `
    <!-- Breadcrumb -->
    <div class="header-breadcrumb" id="header-breadcrumb">
      <span class="header-breadcrumb-base">Home</span>
    </div>

    <!-- Actions -->
    <div class="header-actions">
      <button class="header-icon-btn" id="header-notifications" title="Notifications">
        <i data-lucide="bell"></i>
        <span class="header-notification-dot"></span>
      </button>
      <button class="header-icon-btn" id="header-settings" title="Settings">
        <i data-lucide="settings"></i>
      </button>
      <div class="header-avatar" id="header-avatar" title="Operator">OP</div>
      <button class="btn btn-primary btn-sm" id="header-new-mission">
        <i data-lucide="plus" style="width:14px;height:14px;"></i>
        New Mission
      </button>
    </div>
  `;

  appMain.prepend(headerEl);
  breadcrumbEl = document.getElementById('header-breadcrumb');

  // Initialize Lucide icons in header
  createIcons({ icons });

  // "New Mission" button navigates to upload page
  const newMissionBtn = document.getElementById('header-new-mission');
  newMissionBtn.addEventListener('click', () => {
    navigate('/upload');
  });

  // Listen for route changes to update breadcrumb
  onRouteChange(({ breadcrumb, basePath }) => {
    updateHeader(breadcrumb, basePath);
  });
}

/**
 * Update the header breadcrumb based on route
 * @param {string} routeName - Display name (e.g. 'Mission Dashboard')
 * @param {string} basePath - Route path (e.g. '#/dashboard')
 */
export function updateHeader(routeName, basePath) {
  if (!breadcrumbEl) return;

  if (basePath === '#/') {
    breadcrumbEl.innerHTML = `
      <span class="header-breadcrumb-current">Home</span>
    `;
  } else {
    breadcrumbEl.innerHTML = `
      <a href="#/" style="color: var(--color-text-secondary); text-decoration: none;">Home</a>
      <span class="header-breadcrumb-separator">/</span>
      <span class="header-breadcrumb-current">${routeName}</span>
    `;
  }
}
