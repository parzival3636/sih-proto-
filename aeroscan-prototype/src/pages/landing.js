/* ============================================================
   AEROSCAN-3D — Tactical Landing Page (Screen 1)
   Reference: C2GRID
   - Full-bleed aerial reconnaissance photography with dark vignette
   - Large bold headline with one accent word: "Platform for those who have to act."
   - Two CTAs: Solid amber "START NEW MISSION", outlined "SEE HOW IT WORKS"
   - Floating glass tactical callout cards (Multi-spectral / Metric 3DGS)
   - 3-column stage strip beneath fold (Ingest → Reconstruct → Export)
   - Live video test dropzone with real frame extraction
   - Technical benchmark counters with precision ease-out
   ============================================================ */

import { BRAND, SYSTEM_BENCHMARKS } from '../utils/constants.js';
import { animateCounter } from '../utils/animations.js';
import { navigate } from '../utils/router.js';
import { extractVideoMetadata, extractFrames } from '../utils/videoProcessing.js';
import { setAppState, getAppState, subscribeAppState } from '../utils/appState.js';

/**
 * Render the C2GRID-inspired tactical landing page
 * @returns {HTMLElement}
 */
export function renderLanding() {
  const page = document.createElement('div');
  page.className = 'landing-container';

  page.innerHTML = `
    <!-- ================= 1. FULL-BLEED AERIAL HERO ================= -->
    <section class="landing-hero" id="hero-section">
      <div class="landing-hero-overlay"></div>

      <!-- Top micro-tag -->
      <div style="position: relative; z-index: 2;">
        <span class="micro-label" style="color: var(--color-accent); background: rgba(242, 183, 5, 0.1); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--color-border-accent);">
          DEFENSE & DISASTER RECONNAISSANCE · SINGLE-PASS 3D
        </span>
      </div>

      <!-- Main Headline & Value Proposition -->
      <div class="landing-hero-body">
        <h1 class="landing-hero-title">
          Platform for those<br>who have to <span class="accent-word">act.</span>
        </h1>
        <p class="landing-hero-subhead">
          Turn raw aerial drone footage into metric 3D intelligence in minutes — fully offline, zero ground markers, zero repeat flights.
        </p>
        <div class="landing-hero-ctas">
          <button class="btn btn-primary btn-lg" id="hero-start-mission">
            START NEW MISSION
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button class="btn btn-secondary btn-lg" id="hero-how-it-works">
            SEE HOW IT WORKS
          </button>
        </div>
      </div>

      <!-- Floating Tactical Callout Card (C2GRID Reference Screenshot 2 & 3) -->
      <div class="hero-floating-card">
        <div class="glass-tooltip">
          <div class="micro-label" style="margin-bottom: 6px; color: var(--color-accent);">TACTICAL TELEMETRY</div>
          <div class="glass-tooltip-title">Metric 3D Reconstruction</div>
          <div class="glass-tooltip-desc">
            Monocular video fused with GPS/IMU. 8.3M Gaussian splats generated with sub-3cm georeferenced RMSE accuracy.
          </div>
          <a href="#/upload" class="learn-more-link">
            INSPECT PIPELINE <span>&rarr;</span>
          </a>
        </div>
      </div>

      <!-- 3-Column Strip Beneath the Fold (C2GRID Reference) -->
      <div class="landing-pipeline-strip" id="pipeline-strip">
        <a href="#/upload" class="pipeline-strip-item">
          <div class="pipeline-strip-content">
            <h4>Use any drone footage</h4>
            <p>UAV, UGV & CONSUMER 4K VIDEO</p>
          </div>
          <span class="pipeline-strip-arrow">&rarr;</span>
        </a>

        <a href="#/pipeline" class="pipeline-strip-item">
          <div class="pipeline-strip-content">
            <h4>Reconstruct & detect</h4>
            <p>AUTOMATICALLY IN MINUTES · OFFLINE</p>
          </div>
          <span class="pipeline-strip-arrow">&rarr;</span>
        </a>

        <a href="#/viewer" class="pipeline-strip-item">
          <div class="pipeline-strip-content">
            <h4>Measure, mark & share</h4>
            <p>POINT CLOUD, 3DGS & METRIC DSM</p>
          </div>
          <span class="pipeline-strip-arrow">&rarr;</span>
        </a>
      </div>
    </section>

    <!-- ================= 2. REAL VIDEO EXTRACTION TEST DROPZONE ================= -->
    <section class="landing-dropzone-section" id="interactive-dropzone">
      <div class="dropzone-header">
        <div class="dropzone-title-wrap">
          <span class="micro-label" style="color: var(--color-accent);">REAL HARDWARE SIMULATION</span>
          <h3>Ingest Drone Video & Extract Live Frames</h3>
          <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px;">
            Drag & drop an actual video file (MP4, MOV, WebM). The client-side engine will extract true video metadata and capture real frame canvas snapshots.
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" id="jump-to-upload-btn">
          OPEN FULL INGEST CONSOLE &rarr;
        </button>
      </div>

      <!-- Tactical Upload Drop Box -->
      <div class="tactical-upload-box" id="drop-zone">
        <input type="file" id="real-video-input" accept="video/mp4,video/webm,video/quicktime" style="display: none;" />
        <div class="upload-icon-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
          Select or drop mission flight footage
        </div>
        <div class="micro-label" style="font-size: 0.7rem; color: var(--color-text-muted);">
          SUPPORTS 4K UHD, 1080P FHD · PROCESSED LOCALLY IN BROWSER MEMORY
        </div>
      </div>

      <!-- Live Metadata & Real Extracted Frames Display Container -->
      <div id="live-processing-status" style="display: none;"></div>
      <div id="extracted-frames-container" style="display: none;"></div>
    </section>

    <!-- ================= 3. BENCHMARK METRIC COUNTERS ================= -->
    <section class="landing-benchmarks" id="benchmarks-section">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="micro-label">SYSTEM PERFORMANCE BASELINES</span>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #ffffff; margin-top: 4px;">
            Target Hardware Performance Specifications
          </h3>
        </div>
        <span class="micro-label" style="color: var(--color-text-muted);">
          NVIDIA RTX 4090 · TENSORRT FP16 BENCHMARKS
        </span>
      </div>

      <div class="benchmarks-grid">
        <div class="benchmark-card">
          <div class="benchmark-value" id="counter-time">0</div>
          <div class="benchmark-label">Avg. Flight-to-Model Time</div>
          <div class="benchmark-caption">Landing to metric 3DGS completion</div>
        </div>

        <div class="benchmark-card">
          <div class="benchmark-value" id="counter-rmse">0</div>
          <div class="benchmark-label">Reconstruction RMSE</div>
          <div class="benchmark-caption">Georeferenced spatial error</div>
        </div>

        <div class="benchmark-card">
          <div class="benchmark-value" id="counter-gaussians">0</div>
          <div class="benchmark-label">Gaussian Splat Density</div>
          <div class="benchmark-caption">High-fidelity 3D radiance points</div>
        </div>

        <div class="benchmark-card">
          <div class="benchmark-value" id="counter-passes">0</div>
          <div class="benchmark-label">Flight Passes Required</div>
          <div class="benchmark-caption">Zero repeat missions or battery swaps</div>
        </div>
      </div>
    </section>

    <!-- ================= 4. MINIMAL TACTICAL FOOTER ================= -->
    <footer class="landing-footer">
      <div>
        <span style="font-weight: 700; color: #ffffff;">${BRAND.systemName}</span>
        <span style="margin: 0 8px; color: var(--color-border-subtle);">|</span>
        <span>${BRAND.teamName}</span>
        <span style="margin: 0 8px; color: var(--color-border-subtle);">·</span>
        <span>${BRAND.event}</span>
      </div>
      <div class="micro-label">
        OFFLINE DEFENSE/DISASTER SITUATIONAL INTELLIGENCE
      </div>
    </footer>
  `;

  // --- Attach Interactive Event Handlers ---

  // Hero CTAs
  const startMissionBtn = page.querySelector('#hero-start-mission');
  startMissionBtn.addEventListener('click', () => navigate('/upload'));

  const howItWorksBtn = page.querySelector('#hero-how-it-works');
  howItWorksBtn.addEventListener('click', () => {
    const dropzoneSec = page.querySelector('#interactive-dropzone');
    dropzoneSec.scrollIntoView({ behavior: 'smooth' });
  });

  const jumpUploadBtn = page.querySelector('#jump-to-upload-btn');
  jumpUploadBtn.addEventListener('click', () => navigate('/upload'));

  // Drag and Drop real video input handlers
  const dropZone = page.querySelector('#drop-zone');
  const fileInput = page.querySelector('#real-video-input');

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('video/')) {
      handleRealVideoUpload(files[0], page);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleRealVideoUpload(files[0], page);
    }
  });

  // Check if state already has video metadata from previous upload
  const existingState = getAppState();
  if (existingState.metadata) {
    renderExtractedMetadataAndFrames(page, existingState.metadata, existingState.frames);
  }

  // --- Scroll-Triggered Animated Benchmark Counters ---
  let countersAnimated = false;
  const benchmarksObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !countersAnimated) {
        countersAnimated = true;

        animateCounter(page.querySelector('#counter-time'), 0, SYSTEM_BENCHMARKS.avgProcessingTimeMin, 1800, {
          decimals: 1, suffix: ' min'
        });
        animateCounter(page.querySelector('#counter-rmse'), 0, SYSTEM_BENCHMARKS.reconstructionAccuracyRmseCm, 1800, {
          decimals: 1, suffix: ' cm'
        });
        animateCounter(page.querySelector('#counter-gaussians'), 0, 8.3, 2000, {
          decimals: 1, suffix: 'M'
        });
        animateCounter(page.querySelector('#counter-passes'), 0, 1, 1000, {
          decimals: 0, suffix: ' Pass'
        });

        benchmarksObserver.disconnect();
      }
    });
  }, { threshold: 0.25 });

  requestAnimationFrame(() => {
    const benchSection = page.querySelector('#benchmarks-section');
    if (benchSection) benchmarksObserver.observe(benchSection);
  });

  return page;
}

/**
 * Handle real video file upload: extract metadata + real frames and store in appState
 */
async function handleRealVideoUpload(file, container) {
  const statusContainer = container.querySelector('#live-processing-status');
  const framesContainer = container.querySelector('#extracted-frames-container');

  statusContainer.style.display = 'block';
  statusContainer.innerHTML = `
    <div class="glass-panel" style="padding: 18px 24px; margin-top: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="status-dot"></div>
          <div>
            <div style="font-weight: 700; color: #ffffff; font-size: 0.9rem;">
              Probing Video Metadata: <span style="color: var(--color-accent);">${file.name}</span>
            </div>
            <div class="micro-label" style="margin-top: 2px;">
              PARSING VIDEO STREAM & TIMESTAMPS...
            </div>
          </div>
        </div>
        <div class="mono-number" id="extraction-progress-label" style="font-size: 0.8rem; color: var(--color-accent);">
          EXTRACTING
        </div>
      </div>
    </div>
  `;

  try {
    // 1. Extract genuine metadata
    const metadata = await extractVideoMetadata(file);

    // Update appState with video file and metadata
    setAppState({
      videoFile: file,
      videoUrl: metadata.objectUrl,
      metadata,
    });

    console.log('[AeroScan3D] Real Video Metadata Extracted:', metadata);

    // 2. Extract genuine frames from real video
    const progressLabel = container.querySelector('#extraction-progress-label');
    const frames = await extractFrames(metadata.objectUrl, 8, 480, (prog) => {
      if (progressLabel) {
        progressLabel.textContent = `FRAMES ${prog.current}/${prog.total} (${prog.percent}%)`;
      }
    });

    // Update appState with extracted frames
    setAppState({ frames });
    console.log('[AeroScan3D] Real Extracted Frames (Canvas drawImage):', frames);

    // Render results in the UI
    renderExtractedMetadataAndFrames(container, metadata, frames);

  } catch (error) {
    console.error('[AeroScan3D] Video processing failed:', error);
    statusContainer.innerHTML = `
      <div class="glass-panel" style="padding: 16px 20px; margin-top: 16px; border-color: rgba(255, 82, 82, 0.4);">
        <div style="color: #ff5252; font-weight: 700; font-size: 0.85rem;">Processing Error: ${error.message}</div>
      </div>
    `;
  }
}

/**
 * Display real extracted metadata and frame thumbnails in the UI
 */
function renderExtractedMetadataAndFrames(container, metadata, frames) {
  const statusContainer = container.querySelector('#live-processing-status');
  const framesContainer = container.querySelector('#extracted-frames-container');
  if (!statusContainer || !framesContainer) return;

  statusContainer.style.display = 'block';
  statusContainer.innerHTML = `
    <div class="glass-panel" style="padding: 20px 24px; margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <div class="micro-label" style="color: var(--color-observed);">STATUS: METADATA & FRAMES EXTRACTED AND SAVED TO APPSTATE</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin-top: 4px;">
            ${metadata.name}
          </div>
          <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; font-size: 0.78rem; font-family: var(--font-mono); color: var(--color-text-secondary);">
            <span>FORMAT: <strong style="color: #fff;">${metadata.type}</strong></span>
            <span>SIZE: <strong style="color: #fff;">${metadata.formattedSize}</strong></span>
            <span>DURATION: <strong style="color: #fff;">${metadata.formattedDuration} (${metadata.durationSec}s)</strong></span>
            <span>RESOLUTION: <strong style="color: var(--color-accent);">${metadata.resolution}</strong></span>
            <span>EST. FRAMES: <strong style="color: #fff;">~${metadata.totalFramesEstimate}</strong></span>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary btn-sm" id="go-to-pipeline-btn">
            RUN RECONSTRUCTION PIPELINE &rarr;
          </button>
        </div>
      </div>
    </div>
  `;

  const pipelineBtn = statusContainer.querySelector('#go-to-pipeline-btn');
  if (pipelineBtn) {
    pipelineBtn.addEventListener('click', () => navigate('/pipeline'));
  }

  // Render actual frame thumbnails
  if (frames && frames.length > 0) {
    framesContainer.style.display = 'block';
    framesContainer.innerHTML = `
      <div style="margin-top: 20px;">
        <div class="micro-label" style="margin-bottom: 8px;">
          REAL EXTRACTED FRAME SNAPSHOTS (${frames.length} FRAMES VIA CANVAS DRAWIMAGE)
        </div>
        <div class="extracted-frames-preview">
          ${frames.map(f => `
            <div class="frame-thumbnail-card">
              <img src="${f.dataUrl}" class="frame-thumbnail-img" alt="Frame ${f.index}" />
              <div class="frame-meta-bar">
                <span>#${f.index}</span>
                <span>${f.timestampSec}s</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
