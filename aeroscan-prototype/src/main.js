/* ============================================================
   UNIPASS-3D — Main Entry Point
   Bootstraps sidebar, header, router
   ============================================================ */

import './styles/index.css';
import { initSidebar } from './components/sidebar.js';
import { initHeader } from './components/header.js';
import { initRouter } from './utils/router.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize sidebar (persistent, outside #app-content)
  initSidebar();

  // 2. Initialize header (persistent, outside #app-content)
  initHeader();

  // 3. Initialize router (handles initial route + hashchange)
  initRouter();
});
