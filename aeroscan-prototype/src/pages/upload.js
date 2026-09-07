/* ============================================================
   AEROSCAN-3D — Mission Upload & Telemetry Ingestion (Screen 3)
   - Real video drag & drop + file input (.mp4, .mov, .webm, .srt)
   - Real extractVideoMetadata(file) with typewriter reveal
   - Real playable/scrubbable <video> stream preview
   - Real 16-frame canvas drawImage thumbnail extraction
   - Real DJI .SRT sidecar parser for genuine GPS trajectory
   - Interactive 2D Flight Path Canvas (GPS plotted or illustrative)
   - Reconstruction configuration toggles synced to appState.config
   - "Begin Processing →" locked until extraction finishes 100%
   ============================================================ */

import { extractVideoMetadata, extractFrames, parseSrtTelemetry, formatBytes } from '../utils/videoProcessing.js';
import { setAppState, getAppState } from '../utils/appState.js';
import { navigate } from '../utils/router.js';

let flightCanvasRaf = null;

export function renderUpload() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1350px; margin: 0 auto; width: 100%;';

  const state = getAppState();

  page.innerHTML = `
    <!-- Top Ingestion Breadcrumb Header -->
    <div style="margin-bottom: 28px;">
      <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">
        MISSION INGESTION CONSOLE · STEP 1: FOOTAGE & TELEMETRY
      </div>
      <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">Ingest Drone Survey Footage</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px;">
        Upload single-pass aerial survey video (MP4, MOV). Client-side Web APIs probe intrinsic streams, capture true frame buffers, and parse GPS sidecar metadata.
      </p>
    </div>

    <!-- Main Ingestion Layout -->
    <div style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; align-items: start;">
      
      <!-- LEFT COLUMN: Dropzone, Video Player, and Extracted Thumbnails -->
      <div style="display: flex; flex-direction: column; gap: 22px;">
        
        <!-- Dropzone (Accepts video and optional .srt sidecar) -->
        <div class="tactical-upload-box" id="upload-dropzone">
          <input type="file" id="upload-file-input" accept="video/mp4,video/quicktime,video/webm,.srt" multiple style="display: none;" />
          <div class="upload-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style="font-size: 1rem; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
            Drop flight video (.mp4, .mov) or optional .srt sidecar
          </div>
          <div class="micro-label" style="color: var(--color-text-muted);">
            CLICK TO SELECT · PROCESSED LOCALLY IN BROWSER GPU/CANVAS
          </div>
        </div>

        <!-- Extraction Progress / Loading Overlay -->
        <div id="extraction-overlay" class="glass-panel" style="display: none; padding: 20px 24px; border-color: var(--color-accent);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="status-dot"></span>
              <span class="micro-label" id="extraction-stage-text" style="color: var(--color-accent);">EXTRACTING REAL FRAMES VIA CANVAS...</span>
            </div>
            <span class="mono-number" id="extraction-percent-text" style="font-size: 0.85rem; font-weight: 700; color: #ffffff;">0%</span>
          </div>
          <div class="vram-progress-track" style="height: 4px;">
            <div class="vram-progress-fill" id="extraction-progress-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Real Playing/Scrubbable Video Player -->
        <div id="video-player-container" class="glass-panel" style="display: none; overflow: hidden;">
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="micro-label">ACTIVE STREAM:</span>
              <span id="video-name-tag" style="font-size: 0.8rem; font-family: var(--font-mono); color: #fff; font-weight: 700;"></span>
            </div>
            <div id="video-timecode" class="mono-number" style="font-size: 0.75rem; color: var(--color-accent);">00:00 / 00:00</div>
          </div>
          <video id="mission-video" controls playsinline style="width: 100%; max-height: 380px; background: #000; display: block;"></video>
        </div>

        <!-- Real 16-Frame Thumbnail Scrub Strip -->
        <div id="frames-strip-card" class="glass-panel" style="display: none; padding: 18px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="micro-label">REAL EXTRACTED FRAMES (CLICK THUMBNAIL TO SCRUB STREAM)</span>
            <span id="frames-count-indicator" class="micro-label" style="color: var(--color-accent);">16 FRAMES</span>
          </div>
          <div id="frames-horizontal-strip" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
            <!-- Rendered frame cards inserted here -->
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN: Typewriter Metadata, 2D Flight Path, and Pipeline Config -->
      <div style="display: flex; flex-direction: column; gap: 22px;">
        
        <!-- Metadata Reveal Panel (Typewriter Effect) -->
        <div class="glass-panel" style="padding: 22px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="micro-label">PROBED STREAM TELEMETRY</span>
            <span id="typewriter-cursor" class="micro-label" style="color: var(--color-accent); display: none;">PARSING...</span>
          </div>
          <div id="metadata-reveal-body">
            <div style="padding: 24px 0; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; font-family: var(--font-mono);">
              Awaiting video stream ingestion. Real parameters will appear here after client-side extraction.
            </div>
          </div>
        </div>

        <!-- 2D Flight Path Canvas (GPS or Illustrative) -->
        <div class="glass-panel" style="padding: 20px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="micro-label">SURVEY TRAJECTORY & ALTITUDE</span>
            <span id="flight-path-mode-label" class="micro-label" style="color: var(--color-text-secondary); font-size: 0.65rem;">
              ILLUSTRATIVE PATH (NO .SRT)
            </span>
          </div>
          <div style="position: relative; width: 100%; height: 180px; background: #0c0c10; border-radius: var(--radius-sm); border: 1px solid var(--color-border-subtle); overflow: hidden;">
            <canvas id="flight-canvas" style="width: 100%; height: 100%;"></canvas>
            <div style="position: absolute; bottom: 8px; left: 10px; font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-text-muted);">
              NORTH &uarr; | ALT: 45.2m AGL
            </div>
            <div id="gps-points-badge" style="position: absolute; top: 8px; right: 10px; font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-accent); background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">
              SINGLE PASS
            </div>
          </div>
        </div>

        <!-- Reconstruction Engine Configuration -->
        <div class="glass-panel" style="padding: 22px 24px;">
          <div class="micro-label" style="margin-bottom: 14px;">RECONSTRUCTION ENGINE CONFIG</div>
          
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Processing Mode -->
            <div>
              <label class="micro-label" style="display: block; margin-bottom: 6px;">COMPUTE PROFILE</label>
              <select id="config-mode" style="width: 100%; background: #0a0a0d; border: 1px solid var(--color-border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: #fff; font-family: var(--font-mono); font-size: 0.78rem;">
                <option value="high-accuracy" selected>High Accuracy — 3DGS 8.3M + iSAM2 Factor Graph</option>
                <option value="standard">Standard Field SITREP — Fast Monocular Depth</option>
                <option value="tactical-fast">Tactical Rapid Recon — 5 Min Orthophoto Only</option>
              </select>
            </div>

            <!-- Toggles -->
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.78rem;">
              <label style="display: flex; align-items: center; gap: 10px; color: var(--color-text-secondary); cursor: pointer;">
                <input type="checkbox" id="toggle-dynamic-masking" checked style="accent-color: var(--color-accent);" />
                <span>Enable SAM2 Dynamic Object Masking (filter moving vehicles)</span>
              </label>

              <label style="display: flex; align-items: center; gap: 10px; color: var(--color-text-secondary); cursor: pointer;">
                <input type="checkbox" id="toggle-gtsam" checked style="accent-color: var(--color-accent);" />
                <span>Enable GTSAM iSAM2 Pose Graph Georeferencing</span>
              </label>
            </div>
          </div>
        </div>

        <!-- "Begin Processing" Button (Disabled until extraction is complete) -->
        <button class="btn btn-primary btn-lg" id="btn-begin-processing" style="width: 100%;" disabled>
          BEGIN PROCESSING &rarr;
        </button>
        <div id="button-status-caption" style="text-align: center; font-size: 0.72rem; color: var(--color-text-muted); font-family: var(--font-mono); margin-top: -12px;">
          LOCKED: Awaiting confirmed video & frame buffer extraction
        </div>

      </div>

    </div>
  `;

  // --- Attach Dropzone & File Input Handlers ---
  const dropZone = page.querySelector('#upload-dropzone');
  const fileInput = page.querySelector('#upload-file-input');
  const beginBtn = page.querySelector('#btn-begin-processing');

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleDroppedFiles(files, page);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleDroppedFiles(files, page);
  });

  // Config change listeners to update appState.config
  const modeSelect = page.querySelector('#config-mode');
  modeSelect.addEventListener('change', () => {
    setAppState(prev => ({
      config: { ...prev.config, processingMode: modeSelect.value }
    }));
  });

  const dynMaskToggle = page.querySelector('#toggle-dynamic-masking');
  dynMaskToggle.addEventListener('change', () => {
    setAppState(prev => ({
      config: { ...prev.config, dynamicMasking: dynMaskToggle.checked }
    }));
  });

  const gtsamToggle = page.querySelector('#toggle-gtsam');
  gtsamToggle.addEventListener('change', () => {
    setAppState(prev => ({
      config: { ...prev.config, gtsamOptimization: gtsamToggle.checked }
    }));
  });

  // Begin processing click
  beginBtn.addEventListener('click', () => {
    navigate('/pipeline');
  });

  // Clean unmount hook for the router
  page.unmount = () => {
    if (flightCanvasRaf) {
      cancelAnimationFrame(flightCanvasRaf);
      flightCanvasRaf = null;
    }
  };

  // Restore existing state if already loaded
  requestAnimationFrame(() => {
    const canvas = page.querySelector('#flight-canvas');
    if (state.metadata) {
      revealMetadataTypewriter(page, state.metadata, false);
      setupVideoPlayer(page, state.metadata.objectUrl, state.metadata.name, state.metadata.formattedDuration);
      renderFrameThumbnails(page, state.frames);
      enableBeginButton(page);
    }
    initFlightPathCanvas(canvas, state.telemetry);
  });

  return page;
}

/**
 * Handle multiple dropped files (video + optional .srt sidecar)
 */
async function handleDroppedFiles(files, page) {
  if (!files || files.length === 0) return;

  const videoFile = files.find(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|webm)$/i));
  const srtFile = files.find(f => f.name.endsWith('.srt'));

  // If an SRT sidecar was dropped, parse real GPS telemetry
  if (srtFile) {
    try {
      const srtText = await srtFile.text();
      const telemetry = parseSrtTelemetry(srtText);
      if (telemetry.length > 0) {
        setAppState({ telemetry });
        const modeLabel = page.querySelector('#flight-path-mode-label');
        if (modeLabel) {
          modeLabel.textContent = `REAL GPS TELEMETRY (${telemetry.length} PTS)`;
          modeLabel.style.color = 'var(--color-observed)';
        }
        const canvas = page.querySelector('#flight-canvas');
        initFlightPathCanvas(canvas, telemetry);
      }
    } catch (e) {
      console.warn('[Upload] Failed to parse SRT sidecar:', e);
    }
  }

  if (videoFile) {
    processRealVideo(videoFile, page);
  }
}

/**
 * Main real-data extraction pipeline
 */
async function processRealVideo(file, page) {
  const overlay = page.querySelector('#extraction-overlay');
  const stageText = page.querySelector('#extraction-stage-text');
  const percentText = page.querySelector('#extraction-percent-text');
  const progressBar = page.querySelector('#extraction-progress-bar');
  const beginBtn = page.querySelector('#btn-begin-processing');
  const btnCaption = page.querySelector('#button-status-caption');

  // Lock button and show extraction overlay
  beginBtn.disabled = true;
  btnCaption.textContent = 'EXTRACTING: Parsing video stream & drawing frame canvas buffers...';
  btnCaption.style.color = 'var(--color-accent)';

  overlay.style.display = 'block';
  stageText.textContent = 'READING STREAM HEADER & SENSOR DIMENSIONS...';
  percentText.textContent = '10%';
  progressBar.style.width = '10%';

  try {
    // 1. Genuine metadata extraction
    const metadata = await extractVideoMetadata(file);

    stageText.textContent = `STREAM PROBED (${metadata.resolution}) · EXTRACTING 16 REAL FRAMES VIA CANVAS...`;
    percentText.textContent = '25%';
    progressBar.style.width = '25%';

    // Initialize Video Player with actual URL
    setupVideoPlayer(page, metadata.objectUrl, metadata.name, metadata.formattedDuration);

    // 2. Extract 16 real frames using Canvas drawImage
    const frames = await extractFrames(metadata.objectUrl, 16, 480, (prog) => {
      const overall = 25 + Math.round((prog.percent / 100) * 75);
      percentText.textContent = `${overall}%`;
      progressBar.style.width = `${overall}%`;
      stageText.textContent = `CAPTURING REAL FRAME ${prog.current}/16 AT ${((metadata.durationSec / 17) * prog.current).toFixed(1)}s...`;
    });

    // 3. Write real data into appState (both appState.video and appState.frames)
    setAppState({
      videoFile: file,
      videoUrl: metadata.objectUrl,
      metadata,
      frames,
    });

    console.log('[Upload] Ingest complete. appState populated:', getAppState());

    // 4. Reveal metadata with typewriter effect
    revealMetadataTypewriter(page, metadata, true);

    // 5. Render real frame thumbnails in horizontal strip
    renderFrameThumbnails(page, frames);

    // Complete overlay
    stageText.textContent = 'EXTRACTION COMPLETE · INGESTION VALIDATED';
    stageText.style.color = 'var(--color-observed)';
    percentText.textContent = '100%';
    progressBar.style.width = '100%';

    setTimeout(() => {
      overlay.style.display = 'none';
      enableBeginButton(page);
    }, 800);

  } catch (err) {
    console.error('[Upload] Real video extraction error:', err);
    stageText.textContent = `EXTRACTION ERROR: ${err.message}`;
    stageText.style.color = '#ff5252';
    btnCaption.textContent = 'FAILED: Could not parse video stream. Verify file format.';
    btnCaption.style.color = '#ff5252';
  }
}

/**
 * Setup playable/scrubbable HTML5 video element
 */
function setupVideoPlayer(page, videoUrl, name, formattedDuration) {
  const container = page.querySelector('#video-player-container');
  const video = page.querySelector('#mission-video');
  const nameTag = page.querySelector('#video-name-tag');
  const timecode = page.querySelector('#video-timecode');

  container.style.display = 'block';
  nameTag.textContent = name;
  video.src = videoUrl;

  video.addEventListener('timeupdate', () => {
    const curMins = Math.floor(video.currentTime / 60).toString().padStart(2, '0');
    const curSecs = Math.floor(video.currentTime % 60).toString().padStart(2, '0');
    timecode.textContent = `${curMins}:${curSecs} / ${formattedDuration}`;
  });
}

/**
 * Reveal real metadata line-by-line with typewriter effect
 */
function revealMetadataTypewriter(page, metadata, animate = true) {
  const container = page.querySelector('#metadata-reveal-body');
  const cursor = page.querySelector('#typewriter-cursor');
  if (!container) return;

  const lines = [
    { label: 'FILENAME', val: metadata.name },
    { label: 'RESOLUTION', val: metadata.resolution, accent: true },
    { label: 'DURATION', val: `${metadata.formattedDuration} (${metadata.durationSec}s)` },
    { label: 'FILE SIZE', val: metadata.formattedSize },
    { label: 'EST. FRAMES', val: `~${metadata.totalFramesEstimate} @ 30 FPS` },
    { label: 'STREAM CODEC', val: metadata.type.toUpperCase() },
  ];

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 0.78rem;">
      ${lines.map((l, i) => `
        <div id="meta-line-${i}" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px; opacity: ${animate ? 0 : 1};">
          <span style="color: var(--color-text-secondary);">${l.label}:</span>
          <span style="color: ${l.accent ? 'var(--color-accent)' : '#fff'}; font-weight: ${l.accent ? '700' : '500'}; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${l.val}
          </span>
        </div>
      `).join('')}
    </div>
  `;

  if (animate) {
    cursor.style.display = 'inline-block';
    lines.forEach((_, i) => {
      setTimeout(() => {
        const row = container.querySelector(`#meta-line-${i}`);
        if (row) row.style.opacity = '1';
        if (i === lines.length - 1) {
          cursor.style.display = 'none';
        }
      }, (i + 1) * 120);
    });
  }
}

/**
 * Render real frame thumbnails in a horizontal scrub strip
 */
function renderFrameThumbnails(page, frames) {
  const card = page.querySelector('#frames-strip-card');
  const strip = page.querySelector('#frames-horizontal-strip');
  const countBadge = page.querySelector('#frames-count-indicator');
  const video = page.querySelector('#mission-video');

  if (!card || !strip || !frames || frames.length === 0) return;

  card.style.display = 'block';
  countBadge.textContent = `${frames.length} REAL FRAMES`;

  strip.innerHTML = frames.map(f => `
    <div class="frame-thumbnail-card" data-time="${f.timestampSec}" style="min-width: 120px; cursor: pointer; transition: transform 0.15s ease;" title="Click to seek video to ${f.timestampSec}s">
      <img src="${f.dataUrl}" class="frame-thumbnail-img" alt="Frame ${f.index}" style="height: 72px;" />
      <div class="frame-meta-bar">
        <span>#${f.index}</span>
        <span>${f.timestampSec}s</span>
      </div>
    </div>
  `).join('');

  // Clicking thumbnail seeks the real video player
  strip.querySelectorAll('.frame-thumbnail-card').forEach(el => {
    el.addEventListener('click', () => {
      const time = parseFloat(el.getAttribute('data-time'));
      if (video && !isNaN(time)) {
        video.currentTime = time;
        video.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

/**
 * Enable "Begin Processing" button once extraction completes
 */
function enableBeginButton(page) {
  const btn = page.querySelector('#btn-begin-processing');
  const caption = page.querySelector('#button-status-caption');
  if (!btn) return;

  btn.disabled = false;
  caption.textContent = 'READY: Footage validated & frame buffer loaded into appState';
  caption.style.color = 'var(--color-observed)';
}

/**
 * Draw 2D flight path canvas: real GPS if parsed from .SRT, or stylized tactical spline
 */
function initFlightPathCanvas(canvas, telemetry) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resize();

  let dronePos = 0;

  function draw() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Subtle tactical coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (telemetry && telemetry.length > 1) {
      // PLOT REAL GPS COORDINATES
      const lats = telemetry.map(t => t.latitude);
      const lons = telemetry.map(t => t.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      const pad = 24;
      const mapX = lon => pad + ((lon - minLon) / (maxLon - minLon || 1)) * (w - pad * 2);
      const mapY = lat => h - (pad + ((lat - minLat) / (maxLat - minLat || 1)) * (h - pad * 2));

      // Draw GPS flight path
      ctx.beginPath();
      ctx.strokeStyle = '#f2b705';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      telemetry.forEach((pt, i) => {
        const x = mapX(pt.longitude);
        const y = mapY(pt.latitude);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Waypoint dots
      telemetry.forEach((pt, i) => {
        if (i % Math.ceil(telemetry.length / 10) === 0) {
          const x = mapX(pt.longitude);
          const y = mapY(pt.latitude);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();
        }
      });

    } else {
      // ILLUSTRATIVE SMOOTH CURVED PASS
      ctx.beginPath();
      ctx.strokeStyle = '#f2b705';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      ctx.moveTo(30, h * 0.75);
      ctx.bezierCurveTo(w * 0.3, h * 0.2, w * 0.7, h * 0.85, w - 30, h * 0.3);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoints
      const waypoints = [
        { x: 30, y: h * 0.75, label: 'WP-1 (TAKEOFF)' },
        { x: w * 0.45, y: h * 0.42, label: 'WP-2 (SCANNING)' },
        { x: w - 30, y: h * 0.3, label: 'WP-3 (RECOVERY)' },
      ];

      waypoints.forEach(wp => {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f2b705';
        ctx.fill();

        ctx.font = '9px monospace';
        ctx.fillStyle = '#9a9aa5';
        ctx.fillText(wp.label, wp.x - 15, wp.y - 8);
      });

      // Animated drone icon along the curve
      dronePos = (dronePos + 0.003) % 1;
      const t = dronePos;
      // Bezier formula B(t)
      const p0 = { x: 30, y: h * 0.75 };
      const p1 = { x: w * 0.3, y: h * 0.2 };
      const p2 = { x: w * 0.7, y: h * 0.85 };
      const p3 = { x: w - 30, y: h * 0.3 };

      const cx = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
      const cy = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    flightCanvasRaf = requestAnimationFrame(draw);
  }

  draw();
}
