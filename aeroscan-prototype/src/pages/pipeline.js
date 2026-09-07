/* ============================================================
   AEROSCAN-3D — Pipeline Processing Visualizer (Screen 4)
   5-Stage animated reconstruction pipeline operating on
   REAL frames from appState.frames.

   Every thumbnail, depth image, and point cloud color traces
   back to the actual uploaded video — no generic/stock imagery.
   ============================================================ */

import { getAppState, setAppState } from '../utils/appState.js';
import { navigate } from '../utils/router.js';
import {
  runStage1,
  runStage2,
  runStage3,
  runStage4,
  runStage5,
} from '../utils/pipelineStages.js';

const STAGE_NAMES = [
  'Video Prep & Quality Analysis',
  'Pose Estimation & Camera Path',
  'Monocular Depth Estimation',
  '3D Gaussian Splatting',
  'GTSAM/iSAM2 Georeferencing',
];

export function renderPipeline() {
  const page = document.createElement('div');
  page.className = 'pl-page';

  const state = getAppState();
  const hasFrames = state.frames && state.frames.length > 0;
  const meta = state.metadata;

  // ─── Build Layout ───────────────────────────────────────────

  page.innerHTML = `
    <!-- Header -->
    <div class="pl-header">
      <div class="pl-header-bar">
        <div class="pl-header-left">
          <div class="micro-label" style="color: var(--color-accent); margin-bottom: 2px;">RECONSTRUCTION PIPELINE</div>
          <h2>5-Phase Offline Compute Engine</h2>
        </div>
        <div class="pl-header-right">
          ${meta ? `<span class="pl-frame-count-badge">${state.frames.length} REAL FRAMES · ${meta.resolution}</span>` : ''}
          <div class="pl-stage-badge" id="pl-active-badge">
            <span class="pulse-dot"></span>
            <span id="pl-active-stage-label">INITIALIZING</span>
          </div>
        </div>
      </div>
      <div class="pl-progress-strip">
        <div class="pl-progress-fill" id="pl-overall-progress" style="width: 0%"></div>
      </div>
    </div>

    <!-- Main Stage Area -->
    <div class="pl-main">
      <div class="pl-stage-container glass-panel" id="pl-stage-area">
        ${!hasFrames ? `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:12px;text-align:center;">
            <div style="font-size:2rem;opacity:0.5;">⚠</div>
            <div style="font-weight:700;color:#fff;">No Frames Available</div>
            <div class="micro-label" style="color:var(--color-text-muted);">Upload a video and extract frames first</div>
            <button class="btn btn-primary btn-sm" id="pl-go-upload">GO TO UPLOAD</button>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:12px;">
            <div class="pl-stage-name" style="font-size:0.85rem;">PIPELINE READY</div>
            <div style="color:var(--color-text-secondary);font-size:0.8rem;">${state.frames.length} frames from ${meta?.name || 'uploaded video'} loaded</div>
          </div>
        `}
      </div>
    </div>

    <!-- Sidebar -->
    <div class="pl-sidebar" id="pl-sidebar">
      <!-- Stage List -->
      <div class="pl-sidebar-card glass-panel">
        <div class="pl-sidebar-card-title">PIPELINE STAGES</div>
        <div class="pl-stage-list" id="pl-stage-list">
          ${STAGE_NAMES.map((name, i) => `
            <div class="pl-stage-item" data-stage="${i + 1}">
              <span class="pl-stage-item-num">${i + 1}</span>
              <span class="pl-stage-item-label">${name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Live Metrics -->
      <div class="pl-sidebar-card glass-panel">
        <div class="pl-sidebar-card-title">LIVE METRICS</div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Frames Processed</span>
          <span class="pl-sidebar-metric-value" data-metric="frames-processed">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Quality Score</span>
          <span class="pl-sidebar-metric-value" data-metric="quality">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Reproj. Error</span>
          <span class="pl-sidebar-metric-value" data-metric="reproj-error">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Cameras</span>
          <span class="pl-sidebar-metric-value" data-metric="cameras">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Depth Frames</span>
          <span class="pl-sidebar-metric-value" data-metric="depth-frames">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">Point Cloud</span>
          <span class="pl-sidebar-metric-value" data-metric="point-count">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">PSNR</span>
          <span class="pl-sidebar-metric-value" data-metric="psnr">—</span>
        </div>
        <div class="pl-sidebar-metric">
          <span class="pl-sidebar-metric-label">RMSE</span>
          <span class="pl-sidebar-metric-value" data-metric="rmse">—</span>
        </div>
      </div>

      <!-- GPU Temp (Decorative) -->
      <div class="pl-sidebar-card glass-panel">
        <div class="pl-sidebar-card-title">GPU TEMPERATURE</div>
        <div class="pl-gpu-gauge">
          <div class="pl-gpu-bar">
            <div class="pl-gpu-fill" id="pl-gpu-fill" style="width: 0%"></div>
          </div>
          <div class="pl-gpu-label-row">
            <span class="pl-sidebar-metric-value" id="pl-gpu-temp">— °C</span>
            <span class="pl-illustrative-tag">(illustrative — not real hardware)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Terminal -->
    <div class="pl-terminal-wrap">
      <div class="pl-terminal glass-panel" id="pl-terminal">
        <div class="pl-terminal-header">
          <div class="pl-terminal-title">
            <span class="pl-terminal-dot"></span>
            LIVE PIPELINE LOG
          </div>
          <span class="pl-illustrative-tag">Events from real processing loops</span>
        </div>
        <div class="pl-terminal-body" id="pl-terminal-body"></div>
      </div>
    </div>
  `;

  // ─── Event Handlers ────────────────────────────────────────

  const goUploadBtn = page.querySelector('#pl-go-upload');
  if (goUploadBtn) {
    goUploadBtn.addEventListener('click', () => navigate('/upload'));
  }

  // ─── Cancel Token (for cleanup on unmount) ─────────────────

  const cancelToken = { cancelled: false };
  let gpuInterval = null;

  // ─── Unmount Cleanup ───────────────────────────────────────

  page.unmount = () => {
    cancelToken.cancelled = true;
    if (gpuInterval) clearInterval(gpuInterval);
  };

  // ─── Auto-Start Pipeline if Frames Exist ───────────────────

  if (hasFrames) {
    // Use setTimeout to ensure DOM is mounted before starting
    setTimeout(() => {
      if (!cancelToken.cancelled) {
        runPipeline(page, cancelToken);
      }
    }, 400);
  }

  return page;
}

/* ============================================================
   Pipeline Orchestrator — Runs all 5 stages sequentially
   ============================================================ */

async function runPipeline(page, cancelToken) {
  const stageArea = page.querySelector('#pl-stage-area');
  const termBody = page.querySelector('#pl-terminal-body');
  const sidebar = page.querySelector('#pl-sidebar');
  const overallProgress = page.querySelector('#pl-overall-progress');
  const stageBadgeLabel = page.querySelector('#pl-active-stage-label');
  const gpuFill = page.querySelector('#pl-gpu-fill');
  const gpuTemp = page.querySelector('#pl-gpu-temp');

  if (!stageArea || !termBody) return;

  const state = getAppState();

  // Update pipeline state
  setAppState({
    pipeline: {
      ...state.pipeline,
      isProcessing: true,
      isCompleted: false,
      currentStage: 1,
      overallProgress: 0,
    },
  });

  // Initial log
  pushInitialLog(termBody, state);

  // Start decorative GPU temperature gauge
  let gpuTempValue = 42;
  const gpuInterval = setInterval(() => {
    if (cancelToken.cancelled) { clearInterval(gpuInterval); return; }
    // Simulate GPU temperature fluctuation
    gpuTempValue = Math.min(84, Math.max(38, gpuTempValue + (Math.random() - 0.4) * 3));
    if (gpuFill) gpuFill.style.width = `${((gpuTempValue - 30) / 60) * 100}%`;
    if (gpuTemp) gpuTemp.textContent = `${Math.round(gpuTempValue)}°C`;
  }, 800);

  // Store cleanup ref
  const originalUnmount = page.unmount;
  page.unmount = () => {
    cancelToken.cancelled = true;
    clearInterval(gpuInterval);
    if (originalUnmount) originalUnmount();
  };

  const stages = [
    { run: runStage1, name: STAGE_NAMES[0] },
    { run: runStage2, name: STAGE_NAMES[1] },
    { run: runStage3, name: STAGE_NAMES[2] },
    { run: runStage4, name: STAGE_NAMES[3] },
    { run: runStage5, name: STAGE_NAMES[4] },
  ];

  const pipelineStart = performance.now();

  for (let i = 0; i < stages.length; i++) {
    if (cancelToken.cancelled) break;

    const stageNum = i + 1;
    const stage = stages[i];

    // Update appState
    setAppState((s) => ({
      pipeline: {
        ...s.pipeline,
        currentStage: stageNum,
        activeStageName: stage.name,
        overallProgress: Math.round((i / stages.length) * 100),
      },
    }));

    // Update UI
    if (stageBadgeLabel) stageBadgeLabel.textContent = `STAGE ${stageNum} — ${stage.name.toUpperCase()}`;
    if (overallProgress) overallProgress.style.width = `${(i / stages.length) * 100}%`;

    // Update sidebar stage indicators
    updateSidebarStageUI(sidebar, stageNum);

    // Clear stage area for new content
    stageArea.innerHTML = '';

    // Run stage
    try {
      await stage.run(stageArea, termBody, sidebar, cancelToken);
    } catch (err) {
      console.error(`[Pipeline] Error in Stage ${stageNum}:`, err);
      pushTermLog(termBody, `ERROR in Stage ${stageNum}: ${err.message}`, 'warn');
    }
  }

  if (cancelToken.cancelled) return;

  // Pipeline complete
  if (overallProgress) overallProgress.style.width = '100%';
  if (stageBadgeLabel) stageBadgeLabel.textContent = 'PIPELINE COMPLETE';

  const totalTime = ((performance.now() - pipelineStart) / 1000).toFixed(1);

  setAppState((s) => ({
    pipeline: {
      ...s.pipeline,
      isProcessing: false,
      isCompleted: true,
      overallProgress: 100,
      stageProgress: 100,
      activeStageName: 'Complete',
    },
  }));

  // Mark all stages as completed in sidebar
  updateSidebarStageUI(sidebar, 6); // All 5 completed

  // Show completion overlay
  stageArea.innerHTML = `
    <div class="pl-complete-overlay">
      <div class="pl-complete-icon pl-check-anim">✓</div>
      <div class="pl-complete-text">Reconstruction Complete</div>
      <div class="pl-complete-sub">Total pipeline time: ${totalTime}s · ${getAppState().pointCloud?.count?.toLocaleString() || '—'} points generated</div>
      <button class="btn btn-primary" id="pl-go-viewer" style="margin-top:16px;">
        VIEW 3D MODEL →
      </button>
    </div>
  `;

  const viewerBtn = stageArea.querySelector('#pl-go-viewer');
  if (viewerBtn) {
    viewerBtn.addEventListener('click', () => navigate('/viewer'));
  }

  pushTermLog(termBody, `Pipeline finished — total time: ${totalTime}s`, 'success');
  pushTermLog(termBody, `Point cloud stored in appState.pointCloud (${getAppState().pointCloud?.count?.toLocaleString() || 0} points)`, 'success');

  clearInterval(gpuInterval);
}

/* ============================================================
   Helper functions
   ============================================================ */

function pushTermLog(termBody, text, level = 'info') {
  if (!termBody) return;
  const d = new Date();
  const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  const line = document.createElement('div');
  line.className = `pl-log-line ${level}`;
  line.innerHTML = `<span class="pl-log-ts">[${ts}]</span><span class="pl-log-text">${text}</span>`;
  termBody.appendChild(line);
  termBody.scrollTop = termBody.scrollHeight;
}

function pushInitialLog(termBody, state) {
  pushTermLog(termBody, '═══════════════════════════════════════════════', 'info');
  pushTermLog(termBody, 'AEROSCAN-3D RECONSTRUCTION PIPELINE v0.9.0', 'info');
  pushTermLog(termBody, '═══════════════════════════════════════════════', 'info');
  pushTermLog(termBody, `Input: ${state.metadata?.name || 'Unknown'} · ${state.metadata?.resolution || ''} · ${state.metadata?.formattedDuration || ''}`, 'info');
  pushTermLog(termBody, `Frames: ${state.frames.length} extracted · Telemetry: ${state.telemetry?.length || 0} GPS records`, 'info');
  pushTermLog(termBody, `Config: ${state.config?.processingMode || 'standard'} · Gaussians: ${state.config?.gaussianDensity || 'standard'}`, 'info');
  pushTermLog(termBody, 'Starting 5-stage pipeline...', 'warn');
}

function updateSidebarStageUI(sidebar, currentStage) {
  if (!sidebar) return;
  const items = sidebar.querySelectorAll('.pl-stage-item');
  items.forEach((item) => {
    const num = parseInt(item.dataset.stage, 10);
    const numEl = item.querySelector('.pl-stage-item-num');
    item.classList.remove('active', 'completed');
    if (num < currentStage) {
      item.classList.add('completed');
      if (numEl) numEl.textContent = '✓';
    } else if (num === currentStage) {
      item.classList.add('active');
      if (numEl) numEl.textContent = `${num}`;
    } else {
      if (numEl) numEl.textContent = `${num}`;
    }
  });
}
