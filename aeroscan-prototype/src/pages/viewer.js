/* ============================================================
   AEROSCAN-3D — 3D Spatial Intelligence Viewer (Screen 5)
   Full interactive workflow:
   1. Video Source Selection (Predefined Demo Video / Custom Upload)
   2. Frame Strip Review (RGB / Monocular Depth Map verification)
   3. Meta SAM 3D Single-Frame Object Reconstruction Pipeline
   4. High-Precision Three.js 3D Model / Gaussian Radiance Field Scene
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_STATS, MISSION } from '../utils/constants.js';
import { showToast, animateCounter, triggerScanLine } from '../utils/animations.js';

// ── Module State ───────────────────────────────────────────────
let renderer, scene, camera, controls, animFrameId;
let currentModel   = null;
let renderMode     = 'shaded';
let autoRotate     = true;
let pointsMesh     = null;
let originalMats   = [];
let measureMode    = false;
let panelState     = { left: true, right: true, filmstrip: true };
let activeFrameIdx = 0;       // Selected single keyframe index
let isSam3DMode    = false;   // Meta SAM 3D single-frame mode state
let activeVideoSrc = null;    // blob URL or predefined path
let activeVideoName = null;
let currentContainer = null;

// ── Predefined demo video info (Hatay Turkey Disaster Drone Video) ─────
const PREDEFINED = {
  name:     'Hatay_Turkey_Earthquake_Devastation_Survey.mp4',
  size:     '3.4 GB',
  duration: '3:45',
  frames:   8160,
  label:    'VOA News Drone Reconnaissance — Hatay, Turkey Earthquake Site',
  youtubeId: 'jjUL_KnCzqo',
};

// ── 10 disaster area frame thumbnails extracted from video ─────
const FRAMES = Array.from({ length: 10 }, (_, i) =>
  `/assets/frames/frame_${String(i + 1).padStart(3, '0')}.svg`
);
const DEPTHS = Array.from({ length: 10 }, (_, i) =>
  `/assets/depth/depth_${String(i + 1).padStart(3, '0')}.svg`
);

// ─────────────────────────────────────────────────────────────
//  ENTRY POINT — Called by Router
// ─────────────────────────────────────────────────────────────
export function renderViewer() {
  cleanup();

  const container = document.createElement('div');
  container.className = 'viewer-page-container';
  container.style.cssText = 'width: 100%; height: calc(100vh - var(--header-height, 56px)); position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--color-bg-base, #0a0a0d);';

  currentContainer = container;
  
  // Attach unmount hook for router
  container.unmount = () => {
    cleanup();
  };

  showVideoSelector(container);
  return container;
}

// ─────────────────────────────────────────────────────────────
//  PHASE 1 — VIDEO SOURCE SELECTOR
// ─────────────────────────────────────────────────────────────
function showVideoSelector(container = currentContainer) {
  if (!container) return;
  cleanupThree();
  container.innerHTML = buildSelectorHTML();

  // "Use Predefined" button
  container.querySelector('#btn-use-predefined')?.addEventListener('click', () => {
    activeVideoSrc  = '/assets/demo-video.mp4';
    activeVideoName = PREDEFINED.name;
    triggerScanLine();
    transitionToFrameStrip(PREDEFINED, container);
  });

  // Custom file upload
  const fileInput = container.querySelector('#video-file-input');
  const dropzone  = container.querySelector('#upload-dropzone');

  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleVideoFile(file, container);
  });
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleVideoFile(file, container);
  });
}

function handleVideoFile(file, container) {
  if (!file.type.startsWith('video/')) {
    showToast('Please select a valid video file (.mp4, .mov, .avi)', 'error');
    return;
  }
  activeVideoSrc  = URL.createObjectURL(file);
  activeVideoName = file.name;

  const info = {
    name:     file.name,
    size:     formatBytes(file.size),
    duration: 'Analyzing…',
    frames:   8160,
    label:    'Uploaded Video',
  };

  const vid = document.createElement('video');
  vid.src = activeVideoSrc;
  vid.onloadedmetadata = () => {
    info.duration = formatDuration(vid.duration);
    triggerScanLine();
    transitionToFrameStrip(info, container);
  };
  vid.onerror = () => {
    triggerScanLine();
    transitionToFrameStrip(info, container);
  };
}

// ─────────────────────────────────────────────────────────────
//  PHASE 2 — FRAME STRIP + VIDEO PREVIEW → THEN VIEWER
// ─────────────────────────────────────────────────────────────
function transitionToFrameStrip(info, container = currentContainer) {
  if (!container) return;
  cleanupThree();
  container.innerHTML = buildFrameStripHTML(info);

  container.querySelector('#btn-back-to-selector')?.addEventListener('click', () => {
    showVideoSelector(container);
  });

  const video = container.querySelector('#source-video');
  if (video && activeVideoSrc) {
    video.src = activeVideoSrc;
    video.load();
  }

  container.querySelectorAll('.thumb-item').forEach((item, idx) => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
      item.classList.add('active');
      activeFrameIdx = idx;
      const targetTime = (idx / 10) * (video?.duration || 272);
      if (video && !isNaN(targetTime)) video.currentTime = targetTime;
    });
  });

  container.querySelector('#btn-rgb')?.addEventListener('click',   () => setThumbMode('rgb', container));
  container.querySelector('#btn-depth')?.addEventListener('click', () => setThumbMode('depth', container));

  container.querySelector('#btn-open-viewer')?.addEventListener('click', () => {
    isSam3DMode = false;
    launchViewerScreen(info, container);
  });

  container.querySelector('#btn-sam3d-singleframe')?.addEventListener('click', () => {
    runSam3DPipeline(info, activeFrameIdx, container);
  });

  const el = container.querySelector('#frame-count-display');
  if (el) animateCounter(el, info.frames, { duration: 1600 });
}

function launchViewerScreen(info, container = currentContainer) {
  triggerScanLine();
  setTimeout(() => {
    if (!container) return;
    container.innerHTML = buildViewerHTML(info);
    requestAnimationFrame(() => {
      initThreeJS(container);
      bindToolbarEvents(container);
      bindPanelEvents(container);
      bindExportModal(container);
      animateStatCounters(container);
    });
  }, 150);
}

// ─────────────────────────────────────────────────────────────
//  META SAM 3D SINGLE-FRAME RECONSTRUCTION PIPELINE MODAL
// ─────────────────────────────────────────────────────────────
function runSam3DPipeline(info, frameIdx, container = currentContainer) {
  const frameNum = Math.round((frameIdx / 10) * info.frames).toString().padStart(4, '0');
  const frameSrc = FRAMES[frameIdx] || FRAMES[0];
  const depthSrc = DEPTHS[frameIdx] || DEPTHS[0];

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'sam3d-modal-overlay page-enter';
  modalOverlay.innerHTML = /* html */`
    <div class="sam3d-modal">
      <div class="sam3d-modal__header">
        <div class="sam3d-title-badge">✨ META SAM 3D OBJECTS</div>
        <div class="sam3d-title">Single-Frame 3D Model Generation</div>
        <div class="sam3d-sub">Generating zero-shot 3D mesh & point-cloud from video keyframe #${frameNum}</div>
      </div>

      <div class="sam3d-preview-grid">
        <div class="sam3d-frame-card">
          <div class="sam3d-card-label">📷 Input Video Frame #${frameNum}</div>
          <div class="sam3d-img-wrap">
            <img src="${frameSrc}" class="sam3d-img" alt="Frame preview">
            <div class="sam3d-prompt-box">
              <div class="sam3d-target-crosshair">+</div>
              <div class="sam3d-mask-overlay"></div>
              <div class="sam3d-box-label">SAM 3D Target: Collapsed Concrete Skeleton</div>
            </div>
          </div>
        </div>
        <div class="sam3d-frame-card">
          <div class="sam3d-card-label">📐 Monocular Depth Map (Depth-Anything v2)</div>
          <div class="sam3d-img-wrap">
            <img src="${depthSrc}" class="sam3d-img" alt="Depth map">
          </div>
        </div>
      </div>

      <div class="sam3d-log-terminal">
        <div class="sam3d-log-line active" id="slog-1">
          <span class="slog-icon">⏳</span> <span>[1/4] Segmenting 2D object mask from keyframe #${frameNum} via SAM backbone...</span>
        </div>
        <div class="sam3d-log-line" id="slog-2">
          <span class="slog-icon">⏳</span> <span>[2/4] Extracting dense monocular depth maps & normal vectors...</span>
        </div>
        <div class="sam3d-log-line" id="slog-3">
          <span class="slog-icon">⏳</span> <span>[3/4] Running Meta SAM 3D mesh synthesis (backend/sam-3d-objects/demo.py)...</span>
        </div>
        <div class="sam3d-log-line" id="slog-4">
          <span class="slog-icon">⏳</span> <span>[4/4] Texturing single-frame 3D mesh & compiling WebGL buffers...</span>
        </div>
      </div>

      <div class="sam3d-progress-wrap">
        <div class="sam3d-progress-bar" id="sam3d-pbar" style="width:15%"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
        <span style="font-size:12px;color:var(--color-text-muted);font-family:var(--font-mono)">
          Target: backend/sam-3d-objects · PyTorch 2.3 + CUDA 12.1
        </span>
        <button class="btn btn-secondary" id="btn-cancel-sam3d">
          Cancel
        </button>
      </div>
    </div>

    <style>
      .sam3d-modal-overlay {
        position: fixed; inset: 0; background: rgba(7, 10, 16, 0.88);
        backdrop-filter: blur(16px); z-index: 9999;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .sam3d-modal {
        background: var(--color-bg-panel, #131317); border: 1px solid var(--color-border-accent, rgba(242, 183, 5, 0.4));
        border-radius: 16px; padding: 28px; width: 680px; max-width: 95vw;
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; gap: 16px;
      }
      .sam3d-title-badge {
        font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--color-accent, #f2b705);
        background: var(--color-accent-dim, rgba(242, 183, 5, 0.12)); border: 1px solid var(--color-border-accent);
        border-radius: 20px; padding: 4px 10px; display: inline-block; margin-bottom: 6px;
      }
      .sam3d-title { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.4px; }
      .sam3d-sub   { font-size: 13px; color: var(--color-text-secondary, #9a9aa5); }
      .sam3d-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .sam3d-frame-card { background: var(--color-bg-base, #0a0a0d); border: 1px solid var(--color-border-subtle, #26262c); border-radius: 12px; padding: 10px; }
      .sam3d-card-label { font-size: 11px; color: var(--color-text-secondary, #9a9aa5); margin-bottom: 8px; font-weight: 600; }
      .sam3d-img-wrap { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; }
      .sam3d-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .sam3d-prompt-box {
        position: absolute; top: 15%; left: 20%; right: 25%; bottom: 20%;
        border: 2px dashed var(--color-accent, #f2b705); background: rgba(242, 183, 5, 0.15);
        border-radius: 6px; box-shadow: 0 0 16px rgba(242, 183, 5, 0.3);
        animation: pulse-box 2s infinite ease-in-out;
      }
      @keyframes pulse-box { 0%,100%{border-color:#f2b705} 50%{border-color:#eab308} }
      .sam3d-target-crosshair {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
        color: #f2b705; font-size: 24px; font-weight: 700; text-shadow: 0 0 8px #000;
      }
      .sam3d-box-label {
        position: absolute; bottom: -20px; left: 0; background: #f2b705; color: #000;
        font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap;
      }
      .sam3d-log-terminal {
        background: rgba(0,0,0,0.6); border: 1px solid var(--color-border-subtle); border-radius: 10px;
        padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 12px;
      }
      .sam3d-log-line { color: var(--color-text-muted); display: flex; align-items: center; gap: 10px; opacity: 0.6; }
      .sam3d-log-line.active { color: var(--color-accent); opacity: 1; font-weight: 600; }
      .sam3d-log-line.done   { color: #22c55e; opacity: 1; }
      .sam3d-progress-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
      .sam3d-progress-bar  { height: 100%; background: linear-gradient(90deg, #f2b705, #eab308); transition: width 0.4s ease; }
    </style>
  `;

  document.body.appendChild(modalOverlay);

  modalOverlay.querySelector('#btn-cancel-sam3d')?.addEventListener('click', () => {
    modalOverlay.remove();
  });

  let progress = 15;
  const pbar = modalOverlay.querySelector('#sam3d-pbar');

  setTimeout(() => {
    progress = 40;
    if (pbar) pbar.style.width = '40%';
    setLogDone('slog-1', modalOverlay); setLogActive('slog-2', modalOverlay);
  }, 450);

  setTimeout(() => {
    progress = 75;
    if (pbar) pbar.style.width = '75%';
    setLogDone('slog-2', modalOverlay); setLogActive('slog-3', modalOverlay);
  }, 950);

  setTimeout(() => {
    progress = 95;
    if (pbar) pbar.style.width = '95%';
    setLogDone('slog-3', modalOverlay); setLogActive('slog-4', modalOverlay);
  }, 1450);

  setTimeout(() => {
    progress = 100;
    if (pbar) pbar.style.width = '100%';
    setLogDone('slog-4', modalOverlay);

    setTimeout(() => {
      modalOverlay.remove();
      isSam3DMode = true;
      showToast(`✨ SAM 3D single-frame model generated for Frame #${frameNum}!`, 'success', 4000);
      launchViewerScreen(info, container);
    }, 400);
  }, 1900);
}

function setLogDone(id, root = document) {
  const el = root.querySelector('#' + id);
  if (!el) return;
  el.className = 'sam3d-log-line done';
  const icon = el.querySelector('.slog-icon');
  if (icon) icon.textContent = '✅';
}
function setLogActive(id, root = document) {
  const el = root.querySelector('#' + id);
  if (!el) return;
  el.className = 'sam3d-log-line active';
  const icon = el.querySelector('.slog-icon');
  if (icon) icon.textContent = '⚡';
}

function setThumbMode(mode, container) {
  container.querySelector('#btn-rgb')?.classList.toggle('active',   mode === 'rgb');
  container.querySelector('#btn-depth')?.classList.toggle('active', mode === 'depth');

  container.querySelectorAll('.thumb-img').forEach((img, idx) => {
    img.src = mode === 'depth' ? DEPTHS[idx] : FRAMES[idx];
  });
}

// ─────────────────────────────────────────────────────────────
//  HTML BUILDERS
// ─────────────────────────────────────────────────────────────
function buildSelectorHTML() {
  return /* html */`
  <div class="sel-root page-enter">
    <div class="sel-header">
      <div class="sel-breadcrumb">
        <span>3D Viewer</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-active">Select Video Source</span>
      </div>
      <div class="sel-step-badge">Step 1 of 3 — Load Video</div>
    </div>

    <div class="sel-body">
      <!-- Predefined demo card -->
      <div class="source-card source-card--predefined" id="card-predefined">
        <div class="source-card__header">
          <div class="source-card__icon">🎬</div>
          <div>
            <div class="source-card__title">Use Demo Video</div>
            <div class="source-card__sub">Recommended for hackathon demo</div>
          </div>
          <span class="badge badge--complete" style="margin-left:auto">Preloaded</span>
        </div>

        <div class="predefined-meta">
          <div class="meta-row">
            <span class="meta-label">File</span>
            <span class="meta-val">${PREDEFINED.name}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Mission</span>
            <span class="meta-val">${PREDEFINED.label}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Duration</span>
            <span class="meta-val">${PREDEFINED.duration} · 4K · H.265</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Frames</span>
            <span class="meta-val">${PREDEFINED.frames.toLocaleString()} total · 847 selected</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Drone</span>
            <span class="meta-val">${MISSION.drone} · ${MISSION.camera}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">GPS</span>
            <span class="meta-val">36.2021°N, 36.1604°E · Alt 85m</span>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-use-predefined" style="width:100%;justify-content:center;margin-top:8px">
          Use This Video →
        </button>
      </div>

      <div class="sel-divider">
        <div class="sel-divider-line"></div>
        <span class="sel-divider-text">OR</span>
        <div class="sel-divider-line"></div>
      </div>

      <!-- Upload card -->
      <div class="source-card source-card--upload">
        <div class="source-card__header">
          <div class="source-card__icon">📤</div>
          <div>
            <div class="source-card__title">Upload Your Video</div>
            <div class="source-card__sub">MP4, MOV, AVI — any resolution</div>
          </div>
        </div>

        <div class="upload-dropzone" id="upload-dropzone">
          <div class="drone-icon">🚁</div>
          <p class="drop-title">Drag &amp; drop drone footage here</p>
          <p class="drop-sub">or click to browse files</p>
          <p class="drop-formats">MP4 · MOV · AVI · MKV</p>
        </div>

        <input type="file" id="video-file-input" accept="video/*" style="display:none">

        <div class="upload-tips">
          <div class="tip-item">✅ &nbsp;15–60 second clip works best</div>
          <div class="tip-item">✅ &nbsp;1080p or 4K recommended</div>
          <div class="tip-item">✅ &nbsp;Slow, steady drone movement</div>
          <div class="tip-item">⚠️  &nbsp;Processing is simulated — zero repeat required</div>
        </div>
      </div>
    </div>

    <div class="sel-footer">
      <span>🛸 SIH 2026 · Problem Statement #26158 · NTRO</span>
      <span>·</span>
      <span>Powered by 3D Gaussian Splatting + COLMAP SfM</span>
    </div>
  </div>

  <style>
    .sel-root {
      display: flex; flex-direction: column;
      height: 100%; width: 100%; background: var(--color-bg-base, #0a0a0d);
      font-family: var(--font-sans, Inter, sans-serif);
    }
    .sel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 32px; border-bottom: 1px solid var(--color-border-subtle, #26262c);
      background: var(--color-bg-panel, #131317);
    }
    .sel-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted, #5f5f6b); }
    .breadcrumb-sep { color: var(--color-border-subtle); }
    .breadcrumb-active { color: var(--color-text-primary, #fff); font-weight: 600; }
    .sel-step-badge {
      font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
      color: var(--color-accent); background: var(--color-accent-dim);
      border: 1px solid var(--color-border-accent); border-radius: 20px; padding: 5px 12px;
    }
    .sel-body {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 0; padding: 32px; overflow-y: auto;
    }
    .source-card {
      background: var(--color-bg-panel, #131317); border: 1px solid var(--color-border-subtle, #26262c);
      border-radius: 16px; padding: 28px; width: 380px; flex-shrink: 0;
      display: flex; flex-direction: column; gap: 16px;
      transition: all 0.3s ease; position: relative; overflow: hidden;
    }
    .source-card--predefined {
      border-color: var(--color-border-accent);
      box-shadow: 0 0 32px rgba(242, 183, 5, 0.06);
    }
    .source-card__header { display: flex; align-items: center; gap: 14px; }
    .source-card__icon { font-size: 28px; line-height: 1; }
    .source-card__title { font-size: 17px; font-weight: 700; color: var(--color-text-primary); }
    .source-card__sub   { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
    .predefined-meta { display: flex; flex-direction: column; gap: 0; }
    .meta-row {
      display: flex; gap: 12px; padding: 7px 0;
      border-bottom: 1px solid var(--color-border-subtle); font-size: 13px;
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: var(--color-text-muted); width: 68px; flex-shrink: 0; font-weight: 500; }
    .meta-val   { color: var(--color-text-secondary); }
    .badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge--complete { background:rgba(34,197,94,0.12); color:#22c55e; border:1px solid rgba(34,197,94,0.25); }
    .upload-dropzone {
      border: 2px dashed var(--color-border-subtle); border-radius: 12px;
      padding: 36px 24px; text-align: center; cursor: pointer;
      transition: all 0.25s ease; position: relative; overflow: hidden;
      background: var(--color-bg-base);
    }
    .upload-dropzone:hover, .upload-dropzone.drag-over {
      border-color: var(--color-accent); background: var(--color-accent-dim);
    }
    .drone-icon { font-size: 40px; margin-bottom: 12px; }
    .drop-title   { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
    .drop-sub     { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
    .drop-formats { font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono); letter-spacing: 0.5px; }
    .upload-tips  { display: flex; flex-direction: column; gap: 4px; }
    .tip-item     { font-size: 12px; color: var(--color-text-secondary); padding: 2px 0; }
    .sel-divider { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 28px; }
    .sel-divider-line { width: 1px; height: 80px; background: var(--color-border-subtle); }
    .sel-divider-text { font-size: 12px; color: var(--color-text-muted); font-weight: 600; letter-spacing: 1px; }
    .sel-footer {
      padding: 14px 32px; border-top: 1px solid var(--color-border-subtle);
      display: flex; align-items: center; gap: 12px; justify-content: center;
      font-size: 11px; color: var(--color-text-muted);
    }
    .page-enter { animation: page-enter 0.35s ease forwards; }
    @keyframes page-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  </style>`;
}

function buildFrameStripHTML(info) {
  const thumbsHTML = FRAMES.map((src, i) => `
    <div class="thumb-item ${i === 0 ? 'active' : ''}" data-index="${i}">
      <img class="thumb-img" src="${src}" alt="Frame ${i+1}" loading="lazy">
      <div class="thumb-label">Frame ${((i / 10) * info.frames).toFixed(0).padStart(4,'0')}</div>
      <div class="thumb-quality ${i % 5 === 3 ? 'bad' : 'good'}">${i % 5 === 3 ? '✗' : '✓'}</div>
    </div>`).join('');

  return /* html */`
  <div class="strip-root page-enter">
    <div class="strip-header">
      <div class="strip-breadcrumb">
        <span class="breadcrumb-back" id="btn-back-to-selector">← Back</span>
        <span class="breadcrumb-sep">›</span>
        <span>3D Viewer</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-active">Review Frames</span>
      </div>
      <div class="strip-step-badge">Step 2 of 3 — Verify Extracted Frames</div>
    </div>

    <div class="strip-body">
      <!-- LEFT: Video player -->
      <div class="strip-video-col">
        <div class="col-title">📹 Source Footage</div>

        <div class="video-wrapper">
          ${info.youtubeId ? `
            <iframe id="source-video-yt"
              style="width:100%;height:240px;border-radius:12px;border:none"
              src="https://www.youtube.com/embed/${info.youtubeId}?autoplay=1&mute=1&controls=1&rel=0"
              title="Drone Footage of Devastation in Hatay, Turkey"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          ` : `
            <video id="source-video" controls muted loop playsinline
              style="width:100%;border-radius:12px;background:#000;display:block"
              poster="/assets/frames/frame_001.jpg">
              <source src="${activeVideoSrc || ''}" type="video/mp4">
            </video>
          `}
          <div class="video-fallback" id="video-fallback">
            <img src="/assets/frames/frame_001.jpg" alt="Frame preview"
              style="width:100%;border-radius:12px;object-fit:cover;height:100%">
            <div class="video-fallback-badge">🎬 Preview Frame</div>
          </div>
        </div>

        <div class="video-meta-grid">
          <div class="vmeta-item">
            <span class="vmeta-label">File</span>
            <span class="vmeta-val" title="${info.name}">${info.name.length > 28 ? info.name.slice(0,25)+'…' : info.name}</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Duration</span>
            <span class="vmeta-val">${info.duration}</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Total Frames</span>
            <span class="vmeta-val mono" id="frame-count-display">0</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Selected</span>
            <span class="vmeta-val mono" style="color:var(--color-observed,#22c55e)">847</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Rejected</span>
            <span class="vmeta-val mono" style="color:#ef4444">7,313</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Drone</span>
            <span class="vmeta-val">${MISSION.drone}</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">Resolution</span>
            <span class="vmeta-val">${MISSION.resolution}</span>
          </div>
          <div class="vmeta-item">
            <span class="vmeta-label">GPS Alt</span>
            <span class="vmeta-val">${MISSION.altitude} m AGL</span>
          </div>
        </div>

        <div class="pipeline-summary">
          <div class="pipeline-summary__title">Processing Pipeline Applied</div>
          <div class="pipeline-step-row"><span class="ps-done">✅</span><span class="ps-name">Video Preprocessing</span><span class="ps-stat">847 / 8,160 frames kept</span></div>
          <div class="pipeline-step-row"><span class="ps-done">✅</span><span class="ps-name">Pose Estimation (SfM)</span><span class="ps-stat">reprojErr: 0.31 px</span></div>
          <div class="pipeline-step-row"><span class="ps-done">✅</span><span class="ps-name">Depth Estimation</span><span class="ps-stat">47 ms / frame</span></div>
          <div class="pipeline-step-row"><span class="ps-done">✅</span><span class="ps-name">3D Gaussian Splatting</span><span class="ps-stat">8.3M Gaussians · PSNR 31.4dB</span></div>
          <div class="pipeline-step-row"><span class="ps-done">✅</span><span class="ps-name">Georeferencing</span><span class="ps-stat">RMSE 2.3 cm</span></div>
        </div>
      </div>

      <!-- RIGHT: Frame thumbnails -->
      <div class="strip-frames-col">
        <div class="frames-header">
          <div class="col-title">🎞️ Extracted Keyframes (847 selected)</div>
          <div class="view-toggle">
            <button class="view-toggle-btn active" id="btn-rgb">RGB</button>
            <button class="view-toggle-btn" id="btn-depth">Depth Map</button>
          </div>
        </div>

        <div class="thumb-grid">${thumbsHTML}</div>

        <div class="frames-legend">
          <span class="legend-item"><span style="color:#22c55e">✓</span> Accepted keyframe</span>
          <span class="legend-item"><span style="color:#ef4444">✗</span> Rejected (blur/duplicate)</span>
        </div>

        <div class="quality-section">
          <div class="quality-row"><span class="quality-label">Frame Quality Score</span><span class="quality-val" style="color:#22c55e">94.2%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:94.2%"></div></div>
          <div class="quality-row" style="margin-top:10px"><span class="quality-label">Pose Estimation Confidence</span><span class="quality-val" style="color:var(--color-accent)">98.7%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:98.7%"></div></div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;margin-top:auto">
          <button class="btn btn-secondary" id="btn-sam3d-singleframe" style="justify-content:center;padding:12px;border-color:var(--color-border-accent);color:var(--color-accent)">
            <span>✨ Reconstruct 3D from Single Frame (Meta SAM 3D)</span>
          </button>
          <button class="btn btn-primary" id="btn-open-viewer" style="justify-content:center;padding:12px">
            <span>Open Full 3D Scene Viewer →</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <style>
    .strip-root{display:flex;flex-direction:column;height:100%;width:100%;background:var(--color-bg-base,#0a0a0d);font-family:var(--font-sans,Inter,sans-serif)}
    .strip-header{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid var(--color-border-subtle);background:var(--color-bg-panel);flex-shrink:0}
    .strip-breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--color-text-muted)}
    .breadcrumb-back{color:var(--color-accent);cursor:pointer;font-weight:500}
    .breadcrumb-back:hover{text-decoration:underline}
    .breadcrumb-sep{color:var(--color-border-subtle)}
    .breadcrumb-active{color:var(--color-text-primary);font-weight:600}
    .strip-step-badge{font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--color-accent);background:var(--color-accent-dim);border:1px solid var(--color-border-accent);border-radius:20px;padding:5px 12px}
    .strip-body{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0;overflow:hidden}
    .strip-video-col,.strip-frames-col{padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:16px}
    .strip-video-col{border-right:1px solid var(--color-border-subtle);background:var(--color-bg-base)}
    .col-title{font-size:13px;font-weight:600;color:var(--color-text-primary);letter-spacing:-.2px}
    .video-wrapper{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--color-border-subtle);background:#000;min-height:180px}
    .video-fallback{position:absolute;inset:0;display:none}
    .video-fallback-badge{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.7);color:#94a3b8;font-size:11px;padding:4px 10px;border-radius:8px;font-family:var(--font-mono)}
    .video-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--color-border-subtle);border:1px solid var(--color-border-subtle);border-radius:10px;overflow:hidden}
    .vmeta-item{background:var(--color-bg-panel);padding:10px 12px;display:flex;flex-direction:column;gap:3px}
    .vmeta-label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--color-text-muted);font-weight:500}
    .vmeta-val{font-size:13px;color:var(--color-text-primary);font-weight:500}
    .vmeta-val.mono{font-family:var(--font-mono);font-weight:700}
    .pipeline-summary{background:var(--color-bg-panel);border:1px solid var(--color-border-subtle);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px}
    .pipeline-summary__title{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px}
    .pipeline-step-row{display:flex;align-items:center;gap:10px;font-size:12px;padding:4px 0}
    .ps-done{font-size:14px;flex-shrink:0}
    .ps-name{color:var(--color-text-secondary);font-weight:500;flex:1}
    .ps-stat{color:var(--color-text-muted);font-family:var(--font-mono);font-size:11px;white-space:nowrap}

    .frames-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .view-toggle{display:flex;gap:3px;background:var(--color-bg-elevated);border-radius:8px;padding:3px}
    .view-toggle-btn{padding:5px 12px;border-radius:6px;border:none;background:transparent;color:var(--color-text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
    .view-toggle-btn.active{background:var(--color-bg-panel);color:var(--color-accent)}
    .thumb-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
    .thumb-item{position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .2s ease}
    .thumb-item:hover{border-color:var(--color-border-accent);transform:scale(1.03)}
    .thumb-item.active{border-color:var(--color-accent);box-shadow:0 0 12px var(--color-accent-dim)}
    .thumb-img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:var(--color-bg-elevated)}
    .thumb-label{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.65);color:#94a3b8;font-size:9px;font-family:var(--font-mono);padding:2px 4px;text-align:center}
    .thumb-quality{position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-size:9px;font-weight:700}
    .thumb-quality.good{background:rgba(34,197,94,.8);color:#fff}
    .thumb-quality.bad{background:rgba(239,68,68,.8);color:#fff}
    .frames-legend{display:flex;gap:16px;font-size:11px;color:var(--color-text-muted)}
    .legend-item{display:flex;align-items:center;gap:4px}
    .quality-section{background:var(--color-bg-panel);border:1px solid var(--color-border-subtle);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:6px}
    .quality-row{display:flex;justify-content:space-between;align-items:center}
    .quality-label{font-size:12px;color:var(--color-text-secondary)}
    .quality-val{font-family:var(--font-mono);font-size:13px;font-weight:700}
    .progress-track{width:100%;height:5px;background:var(--color-bg-elevated);border-radius:999px;overflow:hidden}
    .progress-fill{height:100%;border-radius:999px;background:var(--color-accent);position:relative;overflow:hidden}
  </style>`;
}

function buildViewerHTML(info) {
  return /* html */`
    <div class="viewer-root page-enter">
      <!-- Floating Toolbar -->
      <div class="viewer-toolbar" id="viewer-toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn active" id="btn-orbit" title="Orbit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/><path d="M2 12h20"/></svg>Orbit
          </button>
          <button class="toolbar-btn" id="btn-pan" title="Pan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>Pan
          </button>
          <button class="toolbar-btn" id="btn-measure" title="Measure">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M3 4v16M21 4v16M3 12h4M3 8h2M3 16h2M17 12h4M19 8h2M19 16h2"/></svg>Measure
          </button>
        </div>
        <div class="toolbar-divider"></div>
        <div class="toolbar-group">
          <button class="toolbar-btn" id="btn-reset" title="Reset view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>Reset
          </button>
          <button class="toolbar-btn active" id="btn-autorotate" title="Auto-rotate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>Auto
          </button>
          <button class="toolbar-btn" id="btn-fullscreen" title="Fullscreen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>Full
          </button>
          <button class="toolbar-btn" id="btn-screenshot" title="Screenshot">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Screenshot
          </button>
        </div>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn toolbar-btn--export" id="btn-export-modal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export
        </button>
      </div>

      <!-- Viewport -->
      <div class="viewer-viewport" id="viewer-viewport">
        <div class="viewer-loading" id="viewer-loading">
          <div class="loading-orb"></div>
          <p class="loading-text">Building 3D scene from ${info.frames.toLocaleString()} frames…</p>
          <div class="loading-bar-track"><div class="loading-bar-fill" id="loading-bar"></div></div>
          <p style="font-size:11px;color:var(--color-text-muted);margin-top:4px;font-family:var(--font-mono)">
            Loading 8,347,291 Gaussians…
          </p>
        </div>
        <div class="measure-tooltip" id="measure-tooltip">📐 12.4 m</div>
        <div class="coord-hud">
          <span>LAT <strong>36.2021°N</strong></span>
          <span class="coord-sep">·</span>
          <span>LON <strong>36.1604°E</strong></span>
          <span class="coord-sep">·</span>
          <span>ALT <strong>85 m</strong></span>
        </div>
      </div>

      <!-- Left Panel -->
      <div class="viewer-panel viewer-panel--left" id="panel-left">
        <div class="panel-header">
          <span class="panel-title">Render Controls</span>
          <button class="panel-close-btn" id="close-left">‹</button>
        </div>
        <div class="panel-section-label">Render Mode</div>
        <div class="render-mode-group">
          ${rmBtn('shaded',     '🎨', 'Textured',     !isSam3DMode && renderMode==='shaded')}
          ${rmBtn('wireframe',  '🔲', 'Wireframe',    !isSam3DMode && renderMode==='wireframe')}
          ${rmBtn('pointcloud', '⚡', 'Point Cloud',   !isSam3DMode && renderMode==='pointcloud')}
          ${rmBtn('sam3d',      '✨', 'Meta SAM 3D',   isSam3DMode)}
        </div>
        <div class="panel-section-label">Overlays</div>
        <div class="toggle-list">
          ${tog('toggle-sam3d',   '✨ Meta SAM 3D Objects', true)}
          ${tog('toggle-grid',    'Ground Grid',            false)}
          ${tog('toggle-axes',    'Coord Axes',             false)}
          ${tog('toggle-bbox',    'Bounding Box',           false)}
          ${tog('toggle-cameras', 'Camera Frustums',        false)}
        </div>
        <div class="panel-section-label">Lighting</div>
        <div class="slider-row">
          <label class="slider-label">Ambient</label>
          <input type="range" id="sl-ambient" min="0" max="200" value="65" class="styled-slider">
          <span class="slider-val" id="v-ambient">65%</span>
        </div>
        <div class="slider-row">
          <label class="slider-label">Sun</label>
          <input type="range" id="sl-direct" min="0" max="200" value="145" class="styled-slider">
          <span class="slider-val" id="v-direct">145%</span>
        </div>
        <div class="slider-row">
          <label class="slider-label">Exposure</label>
          <input type="range" id="sl-exposure" min="50" max="200" value="100" class="styled-slider">
          <span class="slider-val" id="v-exposure">1.0×</span>
        </div>

        <div class="panel-section-label" style="margin-top:8px">Source Video</div>
        <div class="mini-video-wrap">
          <video id="mini-video" muted loop playsinline
            poster="/assets/frames/frame_001.jpg"
            style="width:100%;border-radius:8px;cursor:pointer;border:1px solid var(--color-border-subtle)">
            <source src="${activeVideoSrc || ''}" type="video/mp4">
          </video>
          <div class="mini-video-overlay" id="mini-video-overlay">▶</div>
        </div>
        <div class="mini-frame-strip">
          ${FRAMES.slice(0,5).map((src,i) => `
            <img src="${src}" class="mini-frame" alt="f${i}"
              style="width:calc(20% - 2px);aspect-ratio:16/9;object-fit:cover;border-radius:4px;border:1px solid var(--color-border-subtle);cursor:pointer">`
          ).join('')}
        </div>
      </div>
      <button class="panel-tab panel-tab--left" id="tab-left" style="display:none">Render</button>

      <!-- Right Panel -->
      <div class="viewer-panel viewer-panel--right" id="panel-right">
        <div class="panel-header">
          <button class="panel-close-btn" id="close-right">›</button>
          <span class="panel-title">Model Info</span>
        </div>
        <div class="panel-section-label">Model Statistics</div>
        ${statRow('Gaussians',   'stat-gaussians', '')}
        ${statRow('Vertices',    'stat-vertices', '')}
        ${statRow('Faces',       'stat-faces', '')}
        ${statRow('File Size',   null, MODEL_STATS.fileSize)}
        ${statRow('Bounding Box',null, MODEL_STATS.boundingBox, 'font-size:11px')}
        <div class="panel-section-label" style="margin-top:8px">Quality Metrics</div>
        ${metricPill('PSNR',    MODEL_STATS.psnr,   'accent')}
        ${metricPill('SSIM',    MODEL_STATS.ssim,   'accent')}
        ${metricPill('LPIPS ↓', MODEL_STATS.lpips,  'green')}
        ${metricPill('RMSE',    MODEL_STATS.rmse,   'green')}
        ${metricPill('GSD',     MODEL_STATS.gsd,    '')}
        <div class="panel-section-label" style="margin-top:8px">Mission</div>
        <div class="info-row">📍 ${MISSION.location}</div>
        <div class="info-row">🚁 ${MISSION.drone}</div>
        <div class="info-row">📷 ${MISSION.camera}</div>
        <div class="info-row">📅 ${MISSION.date}</div>
        <div class="info-row">🎞️ ${MISSION.totalFrames.toLocaleString()} frames · ${MISSION.duration}</div>
        <div class="info-row" style="color:var(--color-observed,#22c55e);font-weight:600">✅ Georeferenced (WGS84)</div>
      </div>
      <button class="panel-tab panel-tab--right" id="tab-right" style="display:none">Info</button>

      <!-- Filmstrip -->
      <div class="viewer-filmstrip" id="viewer-filmstrip">
        <div class="filmstrip-label">Source Frames (847 keyframes extracted from ${info.name.split('.')[0]})</div>
        <div class="filmstrip-track">
          ${FRAMES.map((src,i) => `
            <div class="film-thumb" title="Frame ${i+1}">
              <img src="${src}" alt="f${i}" loading="lazy">
              <span class="film-ts">${formatDuration((i/10)*272)}</span>
            </div>`).join('')}
        </div>
        <button class="filmstrip-toggle" id="filmstrip-toggle" title="Toggle filmstrip">▾</button>
      </div>

      <!-- Statusbar -->
      <div class="viewer-statusbar">
        <div class="status-left">
          <span style="color:#22c55e;font-weight:600">● Live</span>
          <span class="s-sep">|</span>
          <span id="status-mode">Textured</span>
          <span class="s-sep">|</span>
          <span id="status-fps">— FPS</span>
        </div>
        <div class="status-center">🛸 ${info.name.split('.')[0].replace(/_/g,' ')}</div>
        <div class="status-right">
          <span id="status-cam">Cam: —</span>
        </div>
      </div>

      <!-- Export Modal -->
      <div class="export-modal-backdrop" id="export-modal-backdrop" style="display:none">
        <div class="export-modal" id="export-modal">
          <div class="export-modal__header">
            <span class="export-modal__title">Export 3D Assets</span>
            <button class="export-modal__close" id="close-export">✕</button>
          </div>
          <p class="export-modal__sub">Select output format. All exports include GPS metadata and RMSE accuracy report.</p>
          <div class="export-options-grid">
            ${exportOpt('GLB',     '📦', '183 MB', '3D Gaussian Splat Scene',     '#f2b705')}
            ${exportOpt('LAS',     '☁️',  '247 MB', 'Georeferenced Point Cloud',   '#eab308')}
            ${exportOpt('GeoTIFF', '🗺️',  '89 MB',  'Orthophoto (1.2 cm/px GSD)',  '#22c55e')}
            ${exportOpt('OBJ',     '🧩', '183 MB', 'Textured Mesh + MTL',          '#f59e0b')}
            ${exportOpt('PDF',     '📄',  '2.3 MB', 'Inspection & Accuracy Report', '#94a3b8')}
            ${exportOpt('ZIP',     '📁', '915 MB', 'All Outputs Bundle',            '#f2b705')}
          </div>
          <div class="export-accuracy">
            <div class="ea-item"><span class="ea-label">RMSE</span><span class="ea-val" style="color:#22c55e">2.3 cm</span></div>
            <div class="ea-item"><span class="ea-label">GSD</span><span class="ea-val">1.2 cm/px</span></div>
            <div class="ea-item"><span class="ea-label">Coverage</span><span class="ea-val">0.31 km²</span></div>
            <div class="ea-item"><span class="ea-label">CRS</span><span class="ea-val">WGS84 / UTM43N</span></div>
          </div>
        </div>
      </div>
    </div>
    <style>${viewerCSS()}</style>`;
}

function rmBtn(mode, icon, label, active) {
  return `<button class="render-mode-btn${active?' active':''}" data-mode="${mode}">
    <span style="font-size:15px">${icon}</span><span>${label}</span></button>`;
}
function tog(id, label, checked) {
  return `<label class="toggle-item">
    <span class="toggle-label">${label}</span>
    <div class="toggle-switch${checked?' on':''}" id="${id}" role="switch" aria-checked="${checked}">
      <div class="toggle-knob"></div></div></label>`;
}
function statRow(label, id, fallback, style='') {
  return `<div class="stat-row">
    <span class="stat-row__label">${label}</span>
    <span class="stat-row__value mono" ${id?`id="${id}"`:''} style="${style}">${id ? '—' : fallback}</span></div>`;
}
function metricPill(label, value, cls) {
  return `<div class="metric-pill">
    <span class="metric-pill__label">${label}</span>
    <span class="metric-pill__value${cls?' '+cls:''}">${value}</span></div>`;
}
function exportOpt(fmt, icon, size, desc, color) {
  return `<button class="export-opt" data-format="${fmt}" style="--eo-color:${color}">
    <span class="eo-icon">${icon}</span>
    <span class="eo-format">${fmt}</span>
    <span class="eo-size">${size}</span>
    <span class="eo-desc">${desc}</span></button>`;
}

// ─────────────────────────────────────────────────────────────
//  THREE.JS INTERACTIVE SCENE INITIALIZATION
// ─────────────────────────────────────────────────────────────
function initThreeJS(container) {
  const vp = container.querySelector('#viewer-viewport');
  if (!vp) return;
  const w  = vp.clientWidth || 1000, h = vp.clientHeight || 700;

  scene  = new THREE.Scene();
  scene.background = new THREE.Color(0x070d1a);
  scene.fog        = new THREE.FogExp2(0x070d1a, 0.0022);

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 10000);
  camera.position.set(80, 60, 120);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace  = THREE.SRGBColorSpace;
  vp.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping   = true;
  controls.dampingFactor   = 0.06;
  controls.autoRotate      = true;
  controls.autoRotateSpeed = 0.4;
  controls.minDistance     = 5;
  controls.maxDistance     = 600;
  controls.maxPolarAngle   = Math.PI / 1.8;
  controls.target.set(0, 10, 0);

  setupLighting();
  const grid = new THREE.GridHelper(400, 80, 0x475569, 0x334155);
  grid.name  = 'grid';
  grid.visible = false;
  scene.add(grid);

  loadModel(container);

  let fc = 0, ft = 0;
  function animate(t) {
    if (!renderer || !scene || !camera) return;
    animFrameId = requestAnimationFrame(animate);
    controls?.update();
    renderer.render(scene, camera);
    fc++;
    if (t - ft > 500) {
      const fps = Math.round(fc / ((t - ft) / 1000));
      const el  = container.querySelector('#status-fps');
      if (el) el.textContent = fps + ' FPS';
      fc = 0; ft = t;
    }
    const ce = container.querySelector('#status-cam');
    if (ce && camera) ce.textContent = `Cam: (${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`;
  }
  animate(0);

  const ro = new ResizeObserver(() => {
    if (!vp || !camera || !renderer) return;
    const nw = vp.clientWidth, nh = vp.clientHeight;
    if (nw === 0 || nh === 0) return;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
  ro.observe(vp);
}

function setupLighting() {
  const amb = new THREE.AmbientLight(0xfff7ed, 0.65); amb.name = 'ambient'; scene.add(amb);

  const key = new THREE.DirectionalLight(0xffedd5, 1.45);
  key.position.set(110, 140, 90); key.castShadow = true; key.name = 'keyLight';
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 600;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 2.5;

  const d = 160;
  key.shadow.camera.left   = -d;
  key.shadow.camera.right  = d;
  key.shadow.camera.top    = d;
  key.shadow.camera.bottom = -d;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x38bdf8, 0.45);
  fill.position.set(-90, 60, -90); fill.name = 'fillLight';
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xf2b705, 0.25);
  rim.position.set(0, 15, -120); rim.name = 'rimLight';
  scene.add(rim);
}

function loadModel(container) {
  const loadingEl  = container.querySelector('#viewer-loading');
  const loadingBar = container.querySelector('#loading-bar');
  let prog = 0;
  const pi = setInterval(() => {
    prog = Math.min(prog + Math.random() * 10, 88);
    if (loadingBar) loadingBar.style.width = prog + '%';
  }, 250);

  new GLTFLoader().load(
    '/assets/model.glb',
    (gltf) => {
      clearInterval(pi);
      if (loadingBar) loadingBar.style.width = '100%';
      const model = gltf.scene; model.name = 'aeroscanModel';
      const box = new THREE.Box3().setFromObject(model);
      const cen = box.getCenter(new THREE.Vector3());
      const siz = box.getSize(new THREE.Vector3());
      const sc  = 100 / Math.max(siz.x, siz.y, siz.z);
      model.position.copy(cen.negate().multiplyScalar(sc));
      model.scale.setScalar(sc);
      model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      scene.add(model); currentModel = model;
      storeOriginalMaterials();
      const fd = Math.max(siz.x, siz.y, siz.z) * sc * 1.5;
      camera.position.set(fd, fd * 0.7, fd);
      controls.target.set(0, siz.y * sc * 0.3, 0); controls.update();
      setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 400);
    },
    (xhr) => { if (xhr.total && loadingBar) loadingBar.style.width = (xhr.loaded / xhr.total * 88) + '%'; },
    () => { clearInterval(pi); buildProceduralScene(); if (loadingEl) loadingEl.style.display = 'none'; }
  );
}

// ─────────────────────────────────────────────────────────────
//  PROCEDURAL EARTHQUAKE DISASTER RECONSTRUCTION SCENE
// ─────────────────────────────────────────────────────────────
function createConcreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#525968'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},0.12)`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(15,20,28,0.7)'; ctx.lineWidth = 2.5;
  for (let c = 0; c < 8; c++) {
    ctx.beginPath();
    let cx = Math.random() * 512, cy = Math.random() * 512;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (Math.random() - 0.5) * 90; cy += Math.random() * 70;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createBrickTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 512, 512);
  const rows = 16, cols = 8;
  const rh = 512 / rows, cw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let c = -1; c <= cols; c++) {
      ctx.fillStyle = Math.random() > 0.35 ? '#ea580c' : '#c2410c';
      ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function buildProceduralScene() {
  const group = new THREE.Group(); group.name = 'aeroscanModel';
  const rng = seededRNG(204);

  const concreteTex = createConcreteTexture();
  const brickTex    = createBrickTexture();

  const concreteMat  = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.82, metalness: 0.15 });
  const ruinedMat    = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, metalness: 0.05 });
  const redRoofMat   = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6, metalness: 0.1 });
  const terraCotta   = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65, metalness: 0.05 });
  const exposedBrick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9, metalness: 0.05 });
  const towerPlaster = new THREE.MeshStandardMaterial({ color: 0xd6bfae, roughness: 0.7, metalness: 0.05 });
  const whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.1 });
  const rebarMat     = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4, metalness: 0.8 });
  const windowGlass  = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85 });

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(800, 800);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, metalness: 0.08 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.1, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Background buildings
  const bgBldgMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  for (let bg = 0; bg < 14; bg++) {
    const bgW = 20 + rng() * 12, bgH = 22 + rng() * 32, bgD = 20 + rng() * 12;
    const bgBldg = new THREE.Mesh(new THREE.BoxGeometry(bgW, bgH, bgD), bgBldgMat);
    const angle = (bg / 14) * Math.PI * 2, dist = 140 + rng() * 40;
    bgBldg.position.set(Math.cos(angle) * dist, bgH / 2, Math.sin(angle) * dist - 30);
    bgBldg.castShadow = bgBldg.receiveShadow = true;
    group.add(bgBldg);
  }

  // Foreground building
  const addForegroundBuilding = () => {
    const fgGroup = new THREE.Group();
    const w = 48, h = 10, d = 26;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteWallMat);
    body.position.set(0, h/2, 10);
    body.castShadow = body.receiveShadow = true;
    fgGroup.add(body);

    const roofBreach = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 12), ruinedMat);
    roofBreach.position.set(-w/3, h - 0.5, 10);
    roofBreach.rotation.set(0.12, 0.1, -0.18);
    fgGroup.add(roofBreach);

    const eavesLeft = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 1.2, d + 1.2), terraCotta);
    eavesLeft.position.set(w * 0.17, h + 0.8, 10);
    fgGroup.add(eavesLeft);

    for (let cx = 8; cx <= 22; cx += 4.5) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, h, 12), whiteWallMat);
      col.position.set(cx, h/2, 23.5);
      if (cx === 17) col.rotation.z = 0.22;
      if (cx === 21.5) col.rotation.x = -0.18;
      col.castShadow = true;
      fgGroup.add(col);
    }
    fgGroup.position.set(0, 0, 15);
    group.add(fgGroup);
  };
  addForegroundBuilding();

  // Sideways collapsed skeletal frame
  const addCenterSidewaysCollapse = () => {
    const colGroup = new THREE.Group();
    const floors = 5, baseW = 28, baseD = 18;

    for (let f = 0; f < floors; f++) {
      const y = f * 2.8;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.8, baseD), concreteMat);
      slab.position.set(0, y, 0);
      slab.castShadow = slab.receiveShadow = true;
      colGroup.add(slab);

      [[-baseW/2+1, -baseD/2+1], [baseW/2-1, -baseD/2+1], [-baseW/2+1, baseD/2-1], [baseW/2-1, baseD/2-1], [0, -baseD/2+1], [0, baseD/2-1]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 1.2), ruinedMat);
        p.position.set(px, y + 1.4, pz);
        p.castShadow = true;
        colGroup.add(p);
      });

      for (let r = 0; r < 5; r++) {
        const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.0, 5), rebarMat);
        rebar.position.set((rng()-0.5)*baseW, y + 1.5, (rng()-0.5)*baseD);
        rebar.rotation.set((rng()-0.5)*1.6, (rng()-0.5)*1.6, (rng()-0.5)*1.6);
        colGroup.add(rebar);
      }
    }

    colGroup.position.set(-2, 4, -15);
    colGroup.rotation.set(0.2, 0.15, -0.6);
    group.add(colGroup);
  };
  addCenterSidewaysCollapse();

  // Left standing tower with tilt
  const addLeftStandingTower = () => {
    const towerGroup = new THREE.Group();
    const w = 22, d = 20, floors = 7, floorH = 3.4, totalH = floors * floorH;

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d), towerPlaster);
    bldg.position.set(0, totalH/2, 0);
    bldg.castShadow = bldg.receiveShadow = true;
    towerGroup.add(bldg);

    const cornerBreach = new THREE.Mesh(new THREE.BoxGeometry(7, 8, 7), exposedBrick);
    cornerBreach.position.set(w/2 - 2, totalH * 0.7, d/2 - 2);
    cornerBreach.rotation.set(0.08, 0.15, -0.1);
    towerGroup.add(cornerBreach);

    const roofLeft = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.7, 4.2, 4), redRoofMat);
    roofLeft.position.set(-2, totalH + 2.0, 0);
    roofLeft.rotation.set(0.1, Math.PI / 4, -0.18);
    roofLeft.castShadow = true;
    towerGroup.add(roofLeft);

    for (let f = 1; f < floors; f++) {
      const y = f * floorH;
      const isBroken = f === 3 || f === 5;
      const balc = new THREE.Mesh(new THREE.BoxGeometry(w - 3, 0.45, 2.2), concreteMat);
      balc.position.set(0, y, d/2 + 1.0);
      if (isBroken) {
        balc.rotation.z = -0.38;
        balc.position.x += 1.5;
        const hangRebar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.5, 4), rebarMat);
        hangRebar.position.set(2, y - 1.5, d/2 + 1.2);
        hangRebar.rotation.z = 0.4;
        towerGroup.add(hangRebar);
      }
      towerGroup.add(balc);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(w - 3, 1.0, 0.1), whiteWallMat);
      rail.position.set(0, y + 0.7, d/2 + 2.0);
      if (isBroken) rail.rotation.z = -0.38;
      towerGroup.add(rail);

      for (let wx = -w/2 + 3; wx <= w/2 - 3; wx += 4.5) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), windowGlass);
        win.position.set(wx, y + 1.4, d/2 + 0.05);
        towerGroup.add(win);
      }
    }

    towerGroup.position.set(-36, 0, -45);
    towerGroup.rotation.set(0.05, 0.02, -0.08);
    group.add(towerGroup);
  };
  addLeftStandingTower();

  // Right damaged tower
  const addRightDamagedTower = () => {
    const towerGroup = new THREE.Group();
    const w = 22, d = 20, floors = 7, floorH = 3.4, totalH = floors * floorH;

    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d * 0.6), towerPlaster);
    mainBody.position.set(0, totalH/2, -d*0.2);
    mainBody.castShadow = true;
    towerGroup.add(mainBody);

    for (let f = 1; f <= floors; f++) {
      const y = f * floorH - 0.2;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, d * 0.5), concreteMat);
      slab.position.set(0, y, d * 0.15);
      slab.castShadow = slab.receiveShadow = true;
      towerGroup.add(slab);

      if (f < floors) {
        for (let bx = -w/2 + 3; bx <= w/2 - 3; bx += 5.5) {
          const brickPartition = new THREE.Mesh(new THREE.BoxGeometry(0.8, floorH - 0.6, d * 0.45), exposedBrick);
          brickPartition.position.set(bx, y + (floorH - 0.6)/2 + 0.3, d * 0.15);
          brickPartition.castShadow = true;
          towerGroup.add(brickPartition);
        }
      }
    }

    towerGroup.position.set(38, 0, -35);
    group.add(towerGroup);
  };
  addRightDamagedTower();

  // Rubble field
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 2000; i++) {
    const rx = (rng() - 0.5) * 130, rz = -10 - rng() * 120, ry = 0.3 + rng() * 5.0, sc = 0.25 + rng() * 3.0;
    const chunkMat = rng() > 0.4 ? ruinedMat : (rng() > 0.5 ? exposedBrick : rebarMat);
    const chunk = new THREE.Mesh(chunkGeo, chunkMat);
    chunk.position.set(rx, ry, rz);
    chunk.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
    chunk.scale.set(sc, sc * (0.4 + rng() * 0.8), sc);
    chunk.castShadow = chunk.receiveShadow = true;
    group.add(chunk);
  }

  // Dust cloud
  const pCount = 4000, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3]     = (rng() - 0.5) * 150;
    pPos[i * 3 + 1] = 1 + rng() * 60;
    pPos[i * 3 + 2] = -10 - rng() * 150;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xf1f5f9, size: 0.5, transparent: true, opacity: 0.42 });
  group.add(new THREE.Points(pGeo, pMat));

  // Search & rescue reticles
  const targets = [
    { x: -2, y: 8, z: -15 },
    { x: 38, y: 10, z: -35 },
    { x: -36, y: 12, z: -45 }
  ];
  targets.forEach(t => {
    const nodeRing = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 4.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    nodeRing.position.set(t.x, t.y, t.z);
    nodeRing.rotation.x = Math.PI / 2;
    group.add(nodeRing);

    const nodeDot = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf2b705 })
    );
    nodeDot.position.set(t.x, t.y, t.z);
    group.add(nodeDot);
  });

  scene.add(group); currentModel = group;
  storeOriginalMaterials();

  camera.position.set(0, 68, 92);
  controls.target.set(0, 15, -25);
  controls.update();
}

function seededRNG(s) { return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; }

function storeOriginalMaterials() {
  originalMats = [];
  if (!currentModel) return;
  currentModel.traverse(c => { if (c.isMesh) originalMats.push({mesh:c,mat:c.material}); });
}

function setRenderMode(mode, container = currentContainer) {
  if (!currentModel) return;
  renderMode = mode;
  if (pointsMesh) { scene.remove(pointsMesh); pointsMesh = null; }
  let samBox = scene.getObjectByName('sam3dBox');
  if (samBox) { scene.remove(samBox); }

  if (mode === 'sam3d') {
    isSam3DMode = true;
    currentModel.visible = true;
    originalMats.forEach(({mesh,mat}) => { mesh.material = mat; mesh.material.wireframe = false; });
    
    const box = new THREE.Box3().setFromObject(currentModel);
    box.min.y += 2; box.max.y -= 10; box.min.x += 10; box.max.x -= 10;
    const bHelper = new THREE.Box3Helper(box, new THREE.Color(0xf2b705));
    bHelper.name = 'sam3dBox';
    scene.add(bHelper);
    showToast('✨ Meta SAM 3D Mode Active — Single Frame Reconstructed Model', 'info', 3000);
  } else {
    isSam3DMode = false;
    currentModel.visible = mode !== 'pointcloud';
  }

  if (mode==='shaded') {
    originalMats.forEach(({mesh,mat}) => { mesh.material = mat; mesh.material.wireframe = false; });
  } else if (mode==='wireframe') {
    currentModel.traverse(c => { if (c.isMesh) c.material = new THREE.MeshBasicMaterial({color:0xf2b705,wireframe:true,opacity:0.55,transparent:true}); });
  } else if (mode==='pointcloud') {
    const pos=[], col=[];
    currentModel.traverse(c => {
      if (!c.isMesh) return;
      const p = c.geometry.attributes.position;
      c.updateWorldMatrix(true,false);
      for (let i=0;i<p.count;i+=2) {
        const v = new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(c.matrixWorld);
        pos.push(v.x,v.y,v.z);
        const mc = c.material.color||new THREE.Color(0xf2b705);
        col.push(mc.r,mc.g,mc.b);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    pointsMesh = new THREE.Points(g,new THREE.PointsMaterial({size:0.4,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:0.85}));
    pointsMesh.name='pointCloud'; scene.add(pointsMesh);
  }

  const names={shaded:'Textured',wireframe:'Wireframe',pointcloud:'Point Cloud',sam3d:'✨ Meta SAM 3D'};
  const el = container?.querySelector('#status-mode');
  if (el) el.textContent = isSam3DMode ? `⚡ Meta SAM 3D (Single Frame #${String(activeFrameIdx*80).padStart(4,'0')})` : names[mode];
}

// ─────────────────────────────────────────────────────────────
//  EVENT BINDINGS
// ─────────────────────────────────────────────────────────────
function bindToolbarEvents(container) {
  container.querySelectorAll('.render-mode-btn').forEach(b => b.addEventListener('click', () => {
    container.querySelectorAll('.render-mode-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); setRenderMode(b.dataset.mode, container);
  }));

  const setActive = (id) => ['btn-orbit','btn-pan','btn-measure'].forEach(x =>
    container.querySelector('#' + x)?.classList.toggle('active', x===id));

  container.querySelector('#btn-orbit')?.addEventListener('click', () => {
    if (controls) controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
    setActive('btn-orbit'); measureMode=false;
    const tooltip = container.querySelector('#measure-tooltip');
    if (tooltip) tooltip.style.display='none';
  });
  container.querySelector('#btn-pan')?.addEventListener('click', () => {
    if (controls) controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    setActive('btn-pan'); measureMode=false;
  });
  container.querySelector('#btn-measure')?.addEventListener('click', () => {
    measureMode=!measureMode;
    container.querySelector('#btn-measure')?.classList.toggle('active',measureMode);
    if (measureMode) {
      showToast('📐 Click two points to measure — demo shows 12.4m','info',3000);
      setTimeout(()=>{const t=container.querySelector('#measure-tooltip');if(t)t.style.display='flex';},1200);
    } else {
      const tooltip = container.querySelector('#measure-tooltip');
      if (tooltip) tooltip.style.display='none';
    }
  });
  container.querySelector('#btn-reset')?.addEventListener('click', () => { resetCamera(); showToast('Camera reset','info',1500); });
  container.querySelector('#btn-autorotate')?.addEventListener('click', () => {
    autoRotate=!autoRotate; if (controls) controls.autoRotate=autoRotate;
    container.querySelector('#btn-autorotate')?.classList.toggle('active',autoRotate);
    showToast(autoRotate?'Auto-rotate on':'Auto-rotate off','info',1500);
  });
  container.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
    const vp=container.querySelector('#viewer-viewport');
    if (vp) document.fullscreenElement ? document.exitFullscreen() : vp.requestFullscreen().catch(()=>showToast('Fullscreen unavailable','warning'));
  });
  container.querySelector('#btn-screenshot')?.addEventListener('click', () => {
    if(!renderer) return;
    renderer.render(scene,camera);
    const a=document.createElement('a'); a.href=renderer.domElement.toDataURL('image/png');
    a.download='aeroscan3d_capture.png'; a.click();
    showToast('📸 Screenshot saved','success',2500);
  });

  bindTog('toggle-sam3d', on => {
    if (on) showToast('✨ Meta SAM 3D Objects active — Click any object to segment 3D mask', 'info', 3500);
  }, container);
  bindTog('toggle-grid', on => { const g=scene?.getObjectByName('grid'); if(g) g.visible=on; }, container);
  bindTog('toggle-axes', on => { let ax=scene?.getObjectByName('axes'); if(on&&!ax){ax=new THREE.AxesHelper(50);ax.name='axes';scene.add(ax);}else if(!on&&ax)scene.remove(ax); }, container);
  bindTog('toggle-bbox', on => { let b=scene?.getObjectByName('bbox'); if(on&&!b&&currentModel){b=new THREE.Box3Helper(new THREE.Box3().setFromObject(currentModel),new THREE.Color(0xf2b705));b.name='bbox';scene.add(b);}else if(!on&&b)scene.remove(b); }, container);
  bindTog('toggle-cameras', on => { let f=scene?.getObjectByName('frustums'); if(on&&!f){f=buildFrustums();f.name='frustums';scene.add(f);}else if(!on&&f)scene.remove(f); }, container);

  [['sl-ambient','v-ambient','ambient',v=>v/100],
   ['sl-direct', 'v-direct', 'keyLight',v=>v/100],
   ['sl-exposure','v-exposure',null,v=>v/100]].forEach(([sid,vid,lname,fn]) => {
    container.querySelector('#' + sid)?.addEventListener('input',e=>{
      const v=fn(+e.target.value);
      const vel = container.querySelector('#' + vid);
      if(vid==='v-exposure'){if(vel) vel.textContent=v.toFixed(1)+'×';if(renderer)renderer.toneMappingExposure=v;}
      else{if(vel) vel.textContent=Math.round(v*100)+'%';const l=scene?.getObjectByName(lname);if(l)l.intensity=v;}
    });
  });

  const mv=container.querySelector('#mini-video'), mvo=container.querySelector('#mini-video-overlay');
  mv?.addEventListener('click',()=>{ mv.paused?mv.play():mv.pause(); if(mvo)mvo.style.display=mv.paused?'flex':'none'; });
  mv?.addEventListener('play',()=>{ if(mvo)mvo.style.display='none'; });
  mv?.addEventListener('pause',()=>{ if(mvo)mvo.style.display='flex'; });

  container.querySelectorAll('.film-thumb').forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      activeFrameIdx = i;
      runSam3DPipeline(PREDEFINED, i, container);
    });
  });

  container.querySelector('#filmstrip-toggle')?.addEventListener('click',()=>{
    const fs=container.querySelector('#viewer-filmstrip');
    const btn=container.querySelector('#filmstrip-toggle');
    panelState.filmstrip=!panelState.filmstrip;
    fs.classList.toggle('collapsed',!panelState.filmstrip);
    if(btn) btn.textContent=panelState.filmstrip?'▾':'▴';
  });
}

function bindPanelEvents(container) {
  container.querySelector('#close-left')?.addEventListener('click',()=>{
    container.querySelector('#panel-left').style.display='none';
    container.querySelector('#tab-left').style.display='flex';
  });
  container.querySelector('#tab-left')?.addEventListener('click',()=>{
    container.querySelector('#panel-left').style.display='flex';
    container.querySelector('#tab-left').style.display='none';
  });
  container.querySelector('#close-right')?.addEventListener('click',()=>{
    container.querySelector('#panel-right').style.display='none';
    container.querySelector('#tab-right').style.display='flex';
  });
  container.querySelector('#tab-right')?.addEventListener('click',()=>{
    container.querySelector('#panel-right').style.display='flex';
    container.querySelector('#tab-right').style.display='none';
  });
}

function bindExportModal(container) {
  container.querySelector('#btn-export-modal')?.addEventListener('click',()=>{
    const bd=container.querySelector('#export-modal-backdrop');
    if(bd) bd.style.display='flex';
  });
  container.querySelector('#close-export')?.addEventListener('click',()=>{
    const bd=container.querySelector('#export-modal-backdrop');
    if(bd) bd.style.display='none';
  });
  container.querySelector('#export-modal-backdrop')?.addEventListener('click',(e)=>{
    if(e.target.id==='export-modal-backdrop') e.target.style.display='none';
  });
  container.querySelectorAll('.export-opt').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const fmt=btn.dataset.format;
      const sizes={GLB:'183 MB',LAS:'247 MB',GeoTIFF:'89 MB',OBJ:'183 MB',PDF:'2.3 MB',ZIP:'915 MB'};
      showToast(`⬇️ Download started — aeroscan.${fmt.toLowerCase()} (${sizes[fmt]})`, 'success', 3500);
      const bd=container.querySelector('#export-modal-backdrop');
      if(bd) bd.style.display='none';
    });
  });
}

function bindTog(id, cb, container) {
  container.querySelector('#' + id)?.addEventListener('click',()=>{
    const el=container.querySelector('#' + id); if(!el) return;
    const on=!el.classList.contains('on');
    el.classList.toggle('on',on); el.setAttribute('aria-checked',on); cb(on);
  });
}

function resetCamera() {
  if(!currentModel || !camera || !controls) return;
  const box=new THREE.Box3().setFromObject(currentModel);
  const c=box.getCenter(new THREE.Vector3());
  const s=box.getSize(new THREE.Vector3());
  camera.position.set(Math.max(s.x,s.y,s.z)*1.5,Math.max(s.x,s.y,s.z),Math.max(s.x,s.y,s.z)*1.5);
  controls.target.copy(c); controls.update();
}

function animateStatCounters(container) {
  setTimeout(()=>{
    const gEl = container.querySelector('#stat-gaussians');
    const vEl = container.querySelector('#stat-vertices');
    const fEl = container.querySelector('#stat-faces');
    if (gEl) animateCounter(gEl, 0, MODEL_STATS.gaussians, 2000);
    if (vEl) animateCounter(vEl, 0, MODEL_STATS.vertices,  2000);
    if (fEl) animateCounter(fEl, 0, MODEL_STATS.faces,     2000);
  },800);
}

function buildFrustums() {
  const g=new THREE.Group(), m=new THREE.LineBasicMaterial({color:0xf2b705,transparent:true,opacity:0.45});
  const rng=seededRNG(99);
  for(let i=0;i<40;i++){
    const a=(i/40)*Math.PI*2, r=70+Math.sin(i*.8)*15;
    const apex=new THREE.Vector3(Math.cos(a)*r,55+Math.sin(i*.5)*10,Math.sin(a)*r);
    const w=8+rng()*4,h=6+rng()*3,d=12;
    const c=[new THREE.Vector3(apex.x-w,apex.y-h,apex.z+d),new THREE.Vector3(apex.x+w,apex.y-h,apex.z+d),
             new THREE.Vector3(apex.x+w,apex.y+h,apex.z+d),new THREE.Vector3(apex.x-w,apex.y+h,apex.z+d)];
    [...c,c[0]].reduce((p,cur)=>{ if(p){g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p,cur]),m));} return cur; },null);
    c.forEach(pt=>g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([apex,pt]),m)));
  }
  return g;
}

// ─────────────────────────────────────────────────────────────
//  TEARDOWN / CLEANUP
// ─────────────────────────────────────────────────────────────
function cleanupThree() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer.domElement?.remove();
    renderer = null;
  }
  if (controls) {
    controls.dispose();
    controls = null;
  }
  scene = null; camera = null; currentModel = null; pointsMesh = null;
  originalMats = []; renderMode = 'shaded'; autoRotate = true;
}

function cleanup() {
  cleanupThree();
  currentContainer = null;
}

// ─────────────────────────────────────────────────────────────
//  CSS INJECTOR
// ─────────────────────────────────────────────────────────────
function viewerCSS() { return `
  .viewer-root{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:var(--color-bg-base,#0a0a0d);overflow:hidden;font-family:var(--font-sans,Inter,sans-serif)}
  .viewer-viewport{flex:1;position:relative;overflow:hidden}
  .viewer-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--color-bg-base,#0a0a0d);z-index:10;gap:14px}
  .loading-orb{width:52px;height:52px;border-radius:50%;border:2px solid var(--color-accent-dim);border-top-color:var(--color-accent,#f2b705);animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-text{font-family:var(--font-mono);font-size:13px;color:var(--color-text-secondary);margin:0}
  .loading-bar-track{width:220px;height:3px;background:rgba(255,255,255,.05);border-radius:999px;overflow:hidden}
  .loading-bar-fill{height:100%;width:0%;background:var(--color-accent,#f2b705);border-radius:999px;transition:width .3s ease}
  .viewer-toolbar{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:3px;background:rgba(19,19,23,.92);backdrop-filter:blur(20px);border:1px solid var(--color-border-subtle);border-radius:12px;padding:5px 7px;z-index:20;box-shadow:0 8px 32px rgba(0,0,0,.6)}
  .toolbar-group{display:flex;align-items:center;gap:2px}
  .toolbar-divider{width:1px;height:22px;background:var(--color-border-subtle);margin:0 3px}
  .toolbar-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:6px;background:transparent;border:none;color:var(--color-text-secondary);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;font-family:inherit}
  .toolbar-btn:hover{background:var(--color-bg-hover);color:var(--color-text-primary)}
  .toolbar-btn.active{background:var(--color-accent-dim);color:var(--color-accent)}
  .toolbar-btn--export{background:var(--color-accent-dim);color:var(--color-accent);border:1px solid var(--color-border-accent)}
  .toolbar-btn--export:hover{background:var(--color-accent-glow)}
  .coord-hud{position:absolute;bottom:10px;left:14px;display:flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;color:var(--color-text-muted);background:rgba(19,19,23,.85);border:1px solid var(--color-border-subtle);border-radius:6px;padding:5px 11px;backdrop-filter:blur(10px)}
  .coord-hud strong{color:var(--color-accent);font-weight:600}
  .coord-sep{color:var(--color-border-subtle)}
  .measure-tooltip{display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--color-accent-dim);border:1px solid var(--color-border-accent);backdrop-filter:blur(12px);border-radius:10px;padding:10px 20px;color:var(--color-accent);font-family:var(--font-mono);font-size:18px;font-weight:700;box-shadow:0 0 24px var(--color-accent-glow);pointer-events:none;animation:pop-in .3s cubic-bezier(.34,1.56,.64,1)}
  @keyframes pop-in{from{transform:translate(-50%,-50%) scale(.8);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  .viewer-panel{position:absolute;top:0;bottom:0;width:236px;background:rgba(19,19,23,.94);backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow-y:auto;z-index:15;scrollbar-width:thin}
  .viewer-panel--left{left:0;border-right:1px solid var(--color-border-subtle)}
  .viewer-panel--right{right:0;border-left:1px solid var(--color-border-subtle)}
  .panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid var(--color-border-subtle);position:sticky;top:0;background:rgba(19,19,23,.98);z-index:2}
  .panel-title{font-size:13px;font-weight:600;color:var(--color-text-primary);letter-spacing:-.2px}
  .panel-close-btn{background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:6px;transition:all .15s;line-height:1}
  .panel-close-btn:hover{background:var(--color-bg-hover);color:var(--color-text-primary)}
  .panel-section-label{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--color-text-muted);padding:10px 14px 3px}
  .render-mode-group{display:flex;flex-direction:column;gap:3px;padding:6px 7px}
  .render-mode-btn{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;background:transparent;border:1px solid transparent;color:var(--color-text-secondary);cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;text-align:left;font-family:inherit}
  .render-mode-btn:hover{background:var(--color-bg-hover);color:var(--color-text-primary)}
  .render-mode-btn.active{background:var(--color-accent-dim);border-color:var(--color-border-accent);color:var(--color-accent)}
  .toggle-list{display:flex;flex-direction:column;padding:3px 14px}
  .toggle-item{display:flex;align-items:center;justify-content:space-between;padding:7px 0;cursor:pointer}
  .toggle-label{font-size:12px;color:var(--color-text-secondary)}
  .toggle-switch{width:34px;height:19px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid var(--color-border-subtle);position:relative;cursor:pointer;transition:all .2s ease}
  .toggle-switch.on{background:var(--color-accent-dim);border-color:var(--color-border-accent)}
  .toggle-knob{width:13px;height:13px;border-radius:50%;background:var(--color-text-muted);position:absolute;top:2px;left:2px;transition:all .2s ease}
  .toggle-switch.on .toggle-knob{left:17px;background:var(--color-accent)}
  .slider-row{display:flex;align-items:center;gap:8px;padding:5px 14px}
  .slider-label{font-size:11px;color:var(--color-text-muted);width:56px;flex-shrink:0}
  .styled-slider{flex:1;-webkit-appearance:none;height:3px;border-radius:999px;background:rgba(255,255,255,.07);cursor:pointer;accent-color:var(--color-accent)}
  .slider-val{font-size:10px;color:var(--color-text-muted);width:34px;text-align:right;font-family:var(--font-mono)}
  .mini-video-wrap{position:relative;margin:4px 12px;border-radius:8px;overflow:hidden;cursor:pointer}
  .mini-video-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);font-size:22px;color:rgba(255,255,255,.8)}
  .mini-frame-strip{display:flex;gap:3px;padding:4px 12px 8px}
  .stat-row{display:flex;align-items:center;justify-content:space-between;padding:6px 14px;border-bottom:1px solid rgba(255,255,255,.03)}
  .stat-row__label{font-size:11px;color:var(--color-text-muted)}
  .stat-row__value{font-size:12px;color:var(--color-text-primary);font-weight:600}
  .stat-row__value.mono{font-family:var(--font-mono)}
  .metric-pill{display:flex;align-items:center;justify-content:space-between;margin:3px 12px;padding:6px 11px;background:rgba(255,255,255,.02);border:1px solid var(--color-border-subtle);border-radius:6px}
  .metric-pill__label{font-size:10px;color:var(--color-text-muted);font-weight:600;letter-spacing:.4px}
  .metric-pill__value{font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--color-text-primary)}
  .metric-pill__value.accent{color:var(--color-accent)}
  .metric-pill__value.green{color:#22c55e}
  .info-row{font-size:12px;color:var(--color-text-secondary);padding:4px 14px}
  .panel-tab{position:absolute;top:50%;z-index:14;transform:translateY(-50%);display:none;flex-direction:column;align-items:center;writing-mode:vertical-rl;padding:12px 7px;background:var(--color-bg-panel);border:1px solid var(--color-border-subtle);cursor:pointer;color:var(--color-text-muted);font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;transition:all .15s;font-family:inherit}
  .panel-tab:hover{color:var(--color-accent);background:var(--color-accent-dim)}
  .panel-tab--left{left:0;border-radius:0 8px 8px 0;border-left:none}
  .panel-tab--right{right:0;border-radius:8px 0 0 8px;border-right:none}
  .viewer-filmstrip{position:absolute;bottom:36px;left:0;right:0;background:rgba(19,19,23,.9);backdrop-filter:blur(16px);border-top:1px solid var(--color-border-subtle);padding:8px 14px;z-index:12;transition:transform .3s ease}
  .viewer-filmstrip.collapsed{transform:translateY(calc(100% - 8px))}
  .filmstrip-label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px}
  .filmstrip-track{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
  .filmstrip-track::-webkit-scrollbar{display:none}
  .film-thumb{position:relative;flex-shrink:0;border-radius:6px;overflow:hidden;border:1px solid var(--color-border-subtle);cursor:pointer;transition:all .2s}
  .film-thumb:hover{border-color:var(--color-border-accent);transform:scale(1.05)}
  .film-thumb img{width:80px;height:45px;object-fit:cover;display:block;background:var(--color-bg-elevated)}
  .film-ts{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.65);color:var(--color-text-muted);font-size:9px;font-family:var(--font-mono);padding:1px 3px;text-align:center}
  .filmstrip-toggle{position:absolute;top:-14px;right:16px;background:var(--color-bg-panel);border:1px solid var(--color-border-subtle);border-radius:6px 6px 0 0;color:var(--color-text-muted);font-size:12px;padding:2px 10px;cursor:pointer;font-family:inherit}
  .filmstrip-toggle:hover{color:var(--color-accent)}
  .viewer-statusbar{display:flex;align-items:center;justify-content:space-between;padding:0 14px;height:36px;background:var(--color-bg-panel);border-top:1px solid var(--color-border-subtle);font-size:11px;font-family:var(--font-mono);color:var(--color-text-muted);flex-shrink:0;position:relative;z-index:12}
  .status-left,.status-right{display:flex;align-items:center;gap:8px}
  .status-center{color:var(--color-text-muted);font-size:11px;position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;overflow:hidden;max-width:40%;text-overflow:ellipsis}
  .s-sep{color:var(--color-border-subtle)}
  .export-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center}
  .export-modal{background:var(--color-bg-panel);border:1px solid var(--color-border-subtle);border-radius:16px;padding:28px;width:520px;max-width:96vw;box-shadow:0 24px 80px rgba(0,0,0,.8)}
  .export-modal__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .export-modal__title{font-size:18px;font-weight:700;color:var(--color-text-primary);letter-spacing:-.4px}
  .export-modal__close{background:none;border:none;color:var(--color-text-muted);font-size:20px;cursor:pointer;padding:2px 6px;border-radius:6px;transition:all .15s}
  .export-modal__close:hover{background:var(--color-bg-hover);color:var(--color-text-primary)}
  .export-modal__sub{font-size:13px;color:var(--color-text-secondary);margin-bottom:20px}
  .export-options-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px}
  .export-opt{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px;border-radius:10px;background:var(--color-bg-base);border:1px solid var(--color-border-subtle);cursor:pointer;color:var(--color-text-secondary);transition:all .18s;font-family:inherit}
  .export-opt:hover{background:var(--color-accent-dim);border-color:var(--color-border-accent);color:var(--color-accent);transform:translateY(-2px)}
  .eo-icon{font-size:22px}
  .eo-format{font-size:13px;font-weight:700;color:inherit}
  .eo-size{font-size:10px;color:var(--color-text-muted)}
  .eo-desc{font-size:10px;color:var(--color-text-muted);text-align:center;line-height:1.3}
  .export-accuracy{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;border-top:1px solid var(--color-border-subtle);padding-top:14px}
  .ea-item{display:flex;flex-direction:column;align-items:center;gap:3px}
  .ea-label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--color-text-muted)}
  .ea-val{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--color-text-primary)}
`; }

function formatBytes(b) {
  if (b>1e9) return (b/1e9).toFixed(1)+' GB';
  if (b>1e6) return (b/1e6).toFixed(1)+' MB';
  return (b/1e3).toFixed(0)+' KB';
}
function formatDuration(s) {
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}
