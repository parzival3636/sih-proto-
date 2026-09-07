/* ============================================================
   AEROSCAN-3D — Mission Upload / Ingest Console (Screen 3)
   Real video upload, client-side metadata probe, HTML5 video player,
   real Canvas frame extraction at seeked timestamps, and appState sync.
   ============================================================ */

import { extractVideoMetadata, extractFrames } from '../utils/videoProcessing.js';
import { setAppState, getAppState } from '../utils/appState.js';
import { navigate } from '../utils/router.js';

/**
 * Render the dedicated Mission Upload page
 * @returns {HTMLElement}
 */
export function renderUpload() {
  const page = document.createElement('div');
  page.className = 'page-container';
  page.style.cssText = 'padding: 32px 48px; max-width: 1300px; margin: 0 auto; width: 100%;';

  page.innerHTML = `
    <!-- Header -->
    <div style="margin-bottom: 28px;">
      <div class="micro-label" style="color: var(--color-accent); margin-bottom: 4px;">MISSION INGESTION PROTOCOL · STEP 1 OF 3</div>
      <h2 style="font-size: 1.8rem; font-weight: 800; color: #ffffff;">Ingest Drone Survey Footage</h2>
      <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px;">
        Upload single-pass aerial survey video (MP4, MOV, WebM). The client engine extracts telemetry, frame timestamps, and intrinsic dimensions directly in-browser.
      </p>
    </div>

    <!-- Main Ingest Grid -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px; align-items: start;">
      <!-- Left: Dropzone & Video Preview -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="tactical-upload-box" id="upload-dropzone">
          <input type="file" id="upload-file-input" accept="video/mp4,video/webm,video/quicktime" style="display: none;" />
          <div class="upload-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
              <path d="M12 12v9"/>
              <path d="m16 16-4-4-4 4"/>
            </svg>
          </div>
          <div style="font-size: 1rem; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
            Drop aerial mission video here or click to browse
          </div>
          <div class="micro-label" style="color: var(--color-text-muted);">
            4K UHD / 1080P FHD · MONOCULAR RGB / EO
          </div>
        </div>

        <!-- Video Player Preview (Hidden until file selected) -->
        <div id="video-preview-wrapper" style="display: none;" class="glass-panel">
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <span class="micro-label">SOURCE STREAM PREVIEW</span>
            <span id="player-timecode" class="mono-number" style="font-size: 0.72rem; color: var(--color-accent);">00:00 / 00:00</span>
          </div>
          <video id="uploaded-video-player" controls playsinline style="width: 100%; max-height: 380px; background: #000; border-radius: 0 0 var(--radius-md) var(--radius-md);"></video>
        </div>
      </div>

      <!-- Right: Technical Extraction Status & Flight Parameters -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Technical Telemetry Card -->
        <div class="glass-panel" style="padding: 24px;">
          <div class="micro-label" style="margin-bottom: 8px;">EXTRACTED STREAM METADATA</div>
          <div id="metadata-display">
            <div style="padding: 24px 0; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; font-family: var(--font-mono);">
              No video file loaded. Upload drone footage to begin extraction.
            </div>
          </div>
        </div>

        <!-- Mission Flight Config (Dev 2 extension parameters) -->
        <div class="glass-panel" style="padding: 24px;">
          <div class="micro-label" style="margin-bottom: 12px;">MISSION PARAMETERS</div>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label class="micro-label" style="display: block; margin-bottom: 6px;">SITE IDENTIFIER</label>
              <input type="text" id="site-id-input" value="SECTOR-4_SURVEY_ALPHA" style="width: 100%; background: #0a0a0d; border: 1px solid var(--color-border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: #fff; font-family: var(--font-mono); font-size: 0.8rem;" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label class="micro-label" style="display: block; margin-bottom: 6px;">CAMERA FOV</label>
                <input type="text" value="84° (DJI Enterprise 24mm eq)" readonly style="width: 100%; background: #0a0a0d; border: 1px solid var(--color-border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-family: var(--font-mono); font-size: 0.75rem;" />
              </div>
              <div>
                <label class="micro-label" style="display: block; margin-bottom: 6px;">IMU SYNC RATE</label>
                <input type="text" value="100 Hz Interpolated" readonly style="width: 100%; background: #0a0a0d; border: 1px solid var(--color-border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-family: var(--font-mono); font-size: 0.75rem;" />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <button class="btn btn-primary btn-lg" id="proceed-pipeline-btn" style="width: 100%;" disabled>
          PROCEED TO RECONSTRUCTION ENGINE &rarr;
        </button>
      </div>
    </div>

    <!-- Extracted Frame Thumbnails Strip -->
    <div id="upload-frames-section" style="margin-top: 32px; display: none;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="micro-label">EXTRACTED FRAME PASSES (CANVAS DRAWIMAGE BUFFER)</span>
        <span id="frames-count-badge" class="micro-label" style="color: var(--color-accent);">8 FRAMES</span>
      </div>
      <div class="extracted-frames-preview" id="upload-frames-preview"></div>
    </div>
  `;

  // --- Attach Handlers ---
  const dropZone = page.querySelector('#upload-dropzone');
  const fileInput = page.querySelector('#upload-file-input');
  const proceedBtn = page.querySelector('#proceed-pipeline-btn');

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
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('video/')) {
      processUpload(files[0], page);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processUpload(files[0], page);
    }
  });

  proceedBtn.addEventListener('click', () => {
    navigate('/pipeline');
  });

  // Restore current appState if video was previously ingested
  const state = getAppState();
  if (state.metadata) {
    displayExtractedData(page, state.metadata, state.frames);
  }

  return page;
}

/**
 * Perform real extraction and update upload UI
 */
async function processUpload(file, container) {
  const metaContainer = container.querySelector('#metadata-display');
  const proceedBtn = container.querySelector('#proceed-pipeline-btn');
  const videoWrapper = container.querySelector('#video-preview-wrapper');
  const videoPlayer = container.querySelector('#uploaded-video-player');

  metaContainer.innerHTML = `
    <div style="padding: 18px 0; display: flex; align-items: center; gap: 12px;">
      <div class="status-dot"></div>
      <div class="micro-label" style="color: var(--color-accent);">PROBING STREAM DIMENSIONS & FPS...</div>
    </div>
  `;

  try {
    // 1. Probe real video metadata
    const metadata = await extractVideoMetadata(file);

    // Bind real video to player
    videoWrapper.style.display = 'block';
    videoPlayer.src = metadata.objectUrl;

    videoPlayer.addEventListener('timeupdate', () => {
      const timecode = container.querySelector('#player-timecode');
      if (timecode) {
        const curMins = Math.floor(videoPlayer.currentTime / 60).toString().padStart(2, '0');
        const curSecs = Math.floor(videoPlayer.currentTime % 60).toString().padStart(2, '0');
        timecode.textContent = `${curMins}:${curSecs} / ${metadata.formattedDuration}`;
      }
    });

    // Update appState
    setAppState({
      videoFile: file,
      videoUrl: metadata.objectUrl,
      metadata,
    });

    console.log('[Upload] Real video loaded into appState:', metadata);

    // 2. Extract genuine frames using Canvas
    metaContainer.innerHTML = `
      <div style="padding: 18px 0; display: flex; align-items: center; gap: 12px;">
        <div class="status-dot"></div>
        <div class="micro-label" style="color: var(--color-accent);">EXTRACTING REAL FRAMES VIA CANVAS DRAWIMAGE (0%)...</div>
      </div>
    `;

    const frames = await extractFrames(metadata.objectUrl, 8, 480, (prog) => {
      const label = metaContainer.querySelector('.micro-label');
      if (label) {
        label.textContent = `EXTRACTING REAL FRAMES VIA CANVAS (${prog.percent}% - ${prog.current}/${prog.total})...`;
      }
    });

    setAppState({ frames });
    console.log('[Upload] Real frames captured and stored in appState:', frames);

    displayExtractedData(container, metadata, frames);

  } catch (err) {
    console.error('[Upload] Extraction failed:', err);
    metaContainer.innerHTML = `
      <div style="color: #ff5252; font-size: 0.8rem; font-weight: 700;">
        Extraction Error: ${err.message}
      </div>
    `;
  }
}

/**
 * Render extracted details onto the upload screen
 */
function displayExtractedData(container, metadata, frames) {
  const metaContainer = container.querySelector('#metadata-display');
  const proceedBtn = container.querySelector('#proceed-pipeline-btn');
  const framesSection = container.querySelector('#upload-frames-section');
  const framesPreview = container.querySelector('#upload-frames-preview');
  const videoWrapper = container.querySelector('#video-preview-wrapper');
  const videoPlayer = container.querySelector('#uploaded-video-player');

  if (videoWrapper && videoPlayer && metadata.objectUrl && !videoPlayer.src) {
    videoWrapper.style.display = 'block';
    videoPlayer.src = metadata.objectUrl;
  }

  metaContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 0.78rem;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
        <span style="color: var(--color-text-secondary);">FILENAME:</span>
        <span style="color: #fff; font-weight: 700; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${metadata.name}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
        <span style="color: var(--color-text-secondary);">RESOLUTION:</span>
        <span style="color: var(--color-accent); font-weight: 700;">${metadata.resolution}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
        <span style="color: var(--color-text-secondary);">DURATION:</span>
        <span style="color: #fff;">${metadata.formattedDuration} (${metadata.durationSec}s)</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
        <span style="color: var(--color-text-secondary);">FILE SIZE:</span>
        <span style="color: #fff;">${metadata.formattedSize}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
        <span style="color: var(--color-text-secondary);">EST. FRAMES:</span>
        <span style="color: #fff;">~${metadata.totalFramesEstimate} @ 30fps</span>
      </div>
    </div>
  `;

  proceedBtn.disabled = false;

  if (frames && frames.length > 0) {
    framesSection.style.display = 'block';
    framesPreview.innerHTML = frames.map(f => `
      <div class="frame-thumbnail-card">
        <img src="${f.dataUrl}" class="frame-thumbnail-img" alt="Frame ${f.index}" />
        <div class="frame-meta-bar">
          <span>#${f.index}</span>
          <span>${f.timestampSec}s</span>
        </div>
      </div>
    `).join('');
  }
}
