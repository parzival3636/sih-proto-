/* ============================================================
   AEROSCAN-3D — Clean Hash-Based SPA Router
   Routes: #/, #/dashboard, #/upload, #/pipeline, #/viewer
   Supports parameter deep linking (e.g. #/viewer/:missionId)
   Persists shared appState across all transitions.
   ============================================================ */

import { renderLanding } from '../pages/landing.js';
import { renderDashboard } from '../pages/dashboard.js';
import { renderUpload } from '../pages/upload.js';
import { renderPipeline } from '../pages/pipeline.js';
import { renderViewer } from '../pages/viewer.js';

const routes = [
  { pattern: /^#\/$/, path: '#/', render: renderLanding, label: 'Overview', breadcrumb: 'Overview' },
  { pattern: /^#\/dashboard$/, path: '#/dashboard', render: renderDashboard, label: 'Missions', breadcrumb: 'Missions Registry' },
  { pattern: /^#\/upload$/, path: '#/upload', render: renderUpload, label: 'New Mission', breadcrumb: 'Ingest Footage' },
  { pattern: /^#\/pipeline$/, path: '#/pipeline', render: renderPipeline, label: 'Processing', breadcrumb: 'Reconstruction Pipeline' },
  { pattern: /^#\/viewer(\/([^/]+))?$/, path: '#/viewer', render: renderViewer, label: '3D Spatial', breadcrumb: '3D Intelligence' },
];

let activeRoute = null;
let currentParams = {};
let currentCleanup = null;
const listeners = [];

/**
 * Match a raw hash against defined routes
 */
function matchRoute(rawHash) {
  const hash = (!rawHash || rawHash === '#' || rawHash === '') ? '#/' : rawHash;
  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (match) {
      const params = {};
      if (route.path === '#/viewer' && match[2]) {
        params.missionId = match[2];
      }
      return { route, params };
    }
  }
  return null;
}

/**
 * Programmatic client navigation
 * @param {string} path - e.g. '/upload' or '#/pipeline'
 */
export function navigate(path) {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : '/' + path}`;
  if (window.location.hash === target) {
    handleRouteChange();
  } else {
    window.location.hash = target;
  }
}

/**
 * Get active route parameters (e.g. { missionId: 'MSN-7091' })
 */
export function getRouteParams() {
  return { ...currentParams };
}

/**
 * Get the current canonical route path (e.g. '#/upload')
 */
export function getCurrentPath() {
  return activeRoute ? activeRoute.path : '#/';
}

/**
 * Subscribe to route changes
 * @param {(routeInfo: { route: typeof routes[0], params: object, path: string, breadcrumb: string }) => void} callback
 */
export function onRouteChange(callback) {
  listeners.push(callback);
}

/**
 * Execute route transition: unmount current page cleanly, mount next page DOM
 */
function handleRouteChange() {
  const matched = matchRoute(window.location.hash);

  if (!matched) {
    // 404 fallback to overview
    window.location.hash = '#/';
    return;
  }

  const { route, params } = matched;
  activeRoute = route;
  currentParams = params;

  // Unmount previous page cleanly if a cleanup hook was registered
  if (typeof currentCleanup === 'function') {
    try {
      currentCleanup();
    } catch (e) {
      console.error('[Router] Error during page unmount:', e);
    }
    currentCleanup = null;
  }

  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = '';

    // Render new page
    const rendered = route.render(params);

    if (rendered instanceof HTMLElement) {
      container.appendChild(rendered);
      // Check if rendered element has an attached unmount hook
      if (typeof rendered.unmount === 'function') {
        currentCleanup = rendered.unmount;
      }
    } else if (typeof rendered === 'string') {
      container.innerHTML = rendered;
    }
  }

  // Notify shell components (sidebar, header)
  listeners.forEach(cb => {
    try {
      cb({
        route,
        params,
        path: route.path,
        breadcrumb: route.breadcrumb,
        label: route.label,
      });
    } catch (err) {
      console.error('[Router] Error in route listener:', err);
    }
  });

  // Scroll to top of content area on navigation
  window.scrollTo(0, 0);
}

/**
 * Initialize hash router
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/';
  } else {
    handleRouteChange();
  }
}
