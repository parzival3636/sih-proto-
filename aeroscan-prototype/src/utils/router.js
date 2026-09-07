/* ============================================================
   UNIPASS-3D — Hash-Based SPA Router
   Supports: #/, #/dashboard, #/upload, #/pipeline, #/viewer,
             #/viewer/:missionId
   ============================================================ */

import { renderLanding } from '../pages/landing.js';
import { renderDashboard } from '../pages/dashboard.js';
import { renderUpload } from '../pages/upload.js';
import { renderPipeline } from '../pages/pipeline.js';
import { renderViewer } from '../pages/viewer.js';
import { NAV_ITEMS } from './constants.js';

/**
 * Route definitions: path pattern → render function & metadata
 */
const routes = [
  { pattern: /^#\/$/, path: '#/', render: renderLanding, label: 'Home', breadcrumb: 'Home' },
  { pattern: /^#\/dashboard$/, path: '#/dashboard', render: renderDashboard, label: 'Dashboard', breadcrumb: 'Mission Dashboard' },
  { pattern: /^#\/upload$/, path: '#/upload', render: renderUpload, label: 'New Mission', breadcrumb: 'Mission Upload' },
  { pattern: /^#\/pipeline$/, path: '#/pipeline', render: renderPipeline, label: 'Processing', breadcrumb: 'Pipeline Visualizer' },
  { pattern: /^#\/viewer(\/([^/]+))?$/, path: '#/viewer', render: renderViewer, label: '3D Viewer', breadcrumb: '3D Model Viewer' },
];

let currentRoute = null;
let routeParams = {};
let onRouteChangeCallbacks = [];

/**
 * Parse the current hash and find matching route
 */
function matchRoute(hash) {
  if (!hash || hash === '#' || hash === '') hash = '#/';

  for (const route of routes) {
    const match = hash.match(route.pattern);
    if (match) {
      const params = {};
      // Extract missionId from viewer route
      if (route.path === '#/viewer' && match[2]) {
        params.missionId = match[2];
      }
      return { route, params };
    }
  }
  return null;
}

/**
 * Get current route parameters (e.g. { missionId: 'MSN-001' })
 */
export function getRouteParams() {
  return { ...routeParams };
}

/**
 * Programmatically navigate to a path
 * @param {string} path - Hash path (e.g. '#/dashboard' or '#/viewer/MSN-001')
 */
export function navigate(path) {
  if (!path.startsWith('#')) path = '#' + path;
  window.location.hash = path;
}

/**
 * Register a callback for route changes
 * Callback receives: { route, params, basePath }
 */
export function onRouteChange(callback) {
  onRouteChangeCallbacks.push(callback);
}

/**
 * Handle a route change: match, render, and notify listeners
 */
function handleRouteChange() {
  const hash = window.location.hash || '#/';
  const matched = matchRoute(hash);

  if (!matched) {
    // 404 fallback: redirect to landing
    window.location.hash = '#/';
    return;
  }

  const { route, params } = matched;
  currentRoute = route;
  routeParams = params;

  // Render the page into #app-content
  const contentEl = document.getElementById('app-content');
  if (contentEl) {
    // Clear previous content
    contentEl.innerHTML = '';

    // Get the rendered DOM from the page module
    const pageEl = route.render(params);
    if (pageEl instanceof HTMLElement) {
      contentEl.appendChild(pageEl);
    } else if (typeof pageEl === 'string') {
      contentEl.innerHTML = pageEl;
    }
  }

  // Notify all listeners (sidebar, header, etc.)
  onRouteChangeCallbacks.forEach(cb => {
    cb({
      route,
      params,
      basePath: route.path,
      breadcrumb: route.breadcrumb,
      label: route.label,
    });
  });
}

/**
 * Get the current route's base path
 */
export function getCurrentPath() {
  return currentRoute ? currentRoute.path : '#/';
}

/**
 * Initialize the router: listen for hash changes and handle initial route
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial load
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/';
  } else {
    handleRouteChange();
  }
}
