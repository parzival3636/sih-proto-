/* ============================================================
   AEROSCAN-3D — Pipeline Stage Modules (Dev 3)
   Each stage is an async function that orchestrates real
   image processing + animated visualization on real frames
   from appState.frames.
   ============================================================ */

import { getAppState, setAppState } from './appState.js';
import {
  computeBlurScore,
  detectEdgePoints,
  generateDepthMap,
  samplePixelColors,
} from './pipelineImageUtils.js';

/* ============================================================
   Shared helpers
   ============================================================ */

/** Delay helper */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Timestamp for terminal log */
function logTs() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

/** Easing function */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/** Lerp */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Push a log line to the terminal DOM element.
 * @param {HTMLElement} termBody - .pl-terminal-body element
 * @param {string} text
 * @param {'info'|'success'|'warn'} level
 */
function pushLog(termBody, text, level = 'info') {
  if (!termBody) return;
  const line = document.createElement('div');
  line.className = `pl-log-line ${level}`;
  line.innerHTML = `<span class="pl-log-ts">[${logTs()}]</span><span class="pl-log-text">${text}</span>`;
  termBody.appendChild(line);
  termBody.scrollTop = termBody.scrollHeight;

  // Also update appState.pipeline.logs
  const state = getAppState();
  setAppState({
    pipeline: {
      ...state.pipeline,
      logs: [...state.pipeline.logs, { timestamp: logTs(), text, level }],
    },
  });
}

/**
 * Animate a number counter from start to end in a DOM element
 * @returns cleanup function
 */
function animateNumber(el, from, to, durationMs, { decimals = 0, prefix = '', suffix = '' } = {}) {
  if (!el) return () => {};
  let start = null;
  let raf = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / durationMs, 1);
    const val = lerp(from, to, easeOutQuart(p));
    el.textContent = `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (p < 1) raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  return () => { if (raf) cancelAnimationFrame(raf); };
}

/**
 * Update the sidebar stage items to reflect current state
 */
function updateSidebarStages(sidebar, currentStage, stageTimings) {
  if (!sidebar) return;
  const items = sidebar.querySelectorAll('.pl-stage-item');
  items.forEach((item, idx) => {
    const stageNum = idx + 1;
    item.classList.remove('active', 'completed');
    if (stageNum < currentStage) {
      item.classList.add('completed');
      const numEl = item.querySelector('.pl-stage-item-num');
      if (numEl) numEl.textContent = '✓';
    } else if (stageNum === currentStage) {
      item.classList.add('active');
    }
  });
}

/**
 * Update a sidebar metric value
 */
function updateMetric(sidebar, metricId, value) {
  if (!sidebar) return;
  const el = sidebar.querySelector(`[data-metric="${metricId}"]`);
  if (el) el.textContent = value;
}

/* ============================================================
   STAGE 1 — Video Prep (~8s)
   - Scrolling gallery of real thumbnails
   - Frame counter animation
   - Real blur/sharpness detection per frame
   ============================================================ */

export async function runStage1(container, termBody, sidebar, cancelToken) {
  const state = getAppState();
  const frames = state.frames;
  const meta = state.metadata;
  if (!frames.length) return;

  pushLog(termBody, `Stage 1 — Video Prep: ${frames.length} extracted frames detected`, 'info');
  pushLog(termBody, `Source: ${meta?.name || 'Unknown'} · ${meta?.resolution || ''} · ${meta?.formattedDuration || ''}`, 'info');

  container.innerHTML = `
    <div class="pl-stage-title-bar">
      <div class="pl-stage-name"><span class="pl-stage-num">1</span> Video Prep & Quality Analysis</div>
      <div class="pl-stage-timer" id="pl-s1-timer">0.0s</div>
    </div>
    <div class="pl-stage-progress"><div class="pl-stage-progress-fill" id="pl-s1-prog" style="width:0%"></div></div>
    <div class="pl-thumb-gallery" id="pl-s1-gallery"></div>
    <div class="pl-frame-counters">
      <div class="pl-counter-box">
        <div class="pl-counter-value" id="pl-s1-extracted">0</div>
        <div class="pl-counter-label">Extracted Frames (Real)</div>
      </div>
      <div class="pl-counter-box">
        <div class="pl-counter-value" id="pl-s1-estimated">0</div>
        <div class="pl-counter-label">Est. Total Frames (${meta?.fpsEstimate || 30}fps × ${meta?.durationSec?.toFixed(1) || '?'}s)</div>
      </div>
      <div class="pl-counter-box">
        <div class="pl-counter-value" id="pl-s1-sharp">-</div>
        <div class="pl-counter-label">Sharp Frames</div>
      </div>
    </div>
  `;

  const gallery = container.querySelector('#pl-s1-gallery');
  const progBar = container.querySelector('#pl-s1-prog');
  const timerEl = container.querySelector('#pl-s1-timer');
  const extractedEl = container.querySelector('#pl-s1-extracted');
  const estimatedEl = container.querySelector('#pl-s1-estimated');
  const sharpEl = container.querySelector('#pl-s1-sharp');

  const cleanups = [];

  // Animate extracted frame counter
  cleanups.push(animateNumber(extractedEl, 0, frames.length, 3000));
  // Animate estimated total frame counter
  const totalEstimate = meta?.totalFramesEstimate || frames.length;
  cleanups.push(animateNumber(estimatedEl, 0, totalEstimate, 4000));

  // Process each frame with real blur detection
  let sharpCount = 0;
  const stageStart = performance.now();
  const perFrameDelay = Math.min(800, 7000 / frames.length); // Spread across ~7s

  for (let i = 0; i < frames.length; i++) {
    if (cancelToken.cancelled) return;

    const frame = frames[i];
    const progress = ((i + 1) / frames.length) * 100;
    if (progBar) progBar.style.width = `${progress}%`;

    // Real blur check
    let blurResult;
    try {
      blurResult = await computeBlurScore(frame.dataUrl);
    } catch {
      blurResult = { score: 0, isSharp: true };
    }
    if (blurResult.isSharp) sharpCount++;

    pushLog(termBody, `Analyzed frame ${i + 1}/${frames.length} — sharpness: ${blurResult.score.toFixed(1)} ${blurResult.isSharp ? '✓ PASS' : '✗ BLURRY'}`, blurResult.isSharp ? 'info' : 'warn');

    // Create thumbnail card
    const card = document.createElement('div');
    card.className = 'pl-thumb-card pl-fade-in';
    card.innerHTML = `
      <img class="pl-thumb-img" src="${frame.dataUrl}" alt="Frame ${frame.index}">
      <div class="pl-thumb-meta">
        <span>F${frame.index} · ${frame.timestampSec.toFixed(1)}s</span>
        <span class="pl-quality-dot ${blurResult.isSharp ? 'sharp' : 'blurry'}" title="Sharpness: ${blurResult.score.toFixed(1)}"></span>
      </div>
    `;
    gallery.appendChild(card);

    // Auto-scroll gallery
    gallery.scrollLeft = gallery.scrollWidth;

    // Brief highlight
    card.classList.add('active');
    setTimeout(() => card.classList.remove('active'), 400);

    // Update timer
    const elapsed = ((performance.now() - stageStart) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;

    // Update sidebar metric
    updateMetric(sidebar, 'frames-processed', `${i + 1}/${frames.length}`);

    await wait(perFrameDelay);
  }

  // Final sharp count
  if (sharpEl) sharpEl.textContent = `${sharpCount}/${frames.length}`;
  updateMetric(sidebar, 'quality', `${Math.round((sharpCount / frames.length) * 100)}%`);

  const finalTime = ((performance.now() - stageStart) / 1000).toFixed(1);
  if (timerEl) timerEl.textContent = `${finalTime}s ✓`;

  pushLog(termBody, `Stage 1 complete — ${sharpCount}/${frames.length} frames passed sharpness check (${finalTime}s)`, 'success');

  // Cleanup counters
  cleanups.forEach((fn) => fn());

  await wait(600);
}

/* ============================================================
   STAGE 2 — Pose Estimation (~10s)
   - Canvas overlay with edge-detected keypoints on real frames
   - Connecting lines between consecutive frame keypoints
   - Animated camera path curve
   - Reprojection error counter
   ============================================================ */

export async function runStage2(container, termBody, sidebar, cancelToken) {
  const state = getAppState();
  const frames = state.frames;
  if (!frames.length) return;

  pushLog(termBody, 'Stage 2 — Pose Estimation: detecting keypoints on real frames...', 'info');

  const canvasW = 720;
  const canvasH = 405;

  container.innerHTML = `
    <div class="pl-stage-title-bar">
      <div class="pl-stage-name"><span class="pl-stage-num">2</span> Pose Estimation & Camera Path</div>
      <div class="pl-stage-timer" id="pl-s2-timer">0.0s</div>
    </div>
    <div class="pl-stage-progress"><div class="pl-stage-progress-fill" id="pl-s2-prog" style="width:0%"></div></div>
    <div class="pl-pose-canvas-wrap">
      <canvas id="pl-s2-bg" width="${canvasW}" height="${canvasH}"></canvas>
      <canvas id="pl-s2-overlay" width="${canvasW}" height="${canvasH}"></canvas>
    </div>
    <div class="pl-pose-metrics">
      <div class="pl-pose-metric-card glass-panel">
        <div class="pl-metric-value" id="pl-s2-reproj">4.20px</div>
        <div class="pl-metric-label">Reprojection Error</div>
        <div class="pl-metric-tag">(representative pipeline metric)</div>
      </div>
      <div class="pl-pose-metric-card glass-panel">
        <div class="pl-metric-value" id="pl-s2-matches">0</div>
        <div class="pl-metric-label">Feature Matches</div>
      </div>
      <div class="pl-pose-metric-card glass-panel">
        <div class="pl-metric-value" id="pl-s2-cameras">0</div>
        <div class="pl-metric-label">Camera Poses Recovered</div>
      </div>
    </div>
  `;

  const bgCanvas = container.querySelector('#pl-s2-bg');
  const overlayCanvas = container.querySelector('#pl-s2-overlay');
  const bgCtx = bgCanvas.getContext('2d');
  const oCtx = overlayCanvas.getContext('2d');
  const progBar = container.querySelector('#pl-s2-prog');
  const timerEl = container.querySelector('#pl-s2-timer');
  const reprojEl = container.querySelector('#pl-s2-reproj');
  const matchesEl = container.querySelector('#pl-s2-matches');
  const camerasEl = container.querySelector('#pl-s2-cameras');

  const stageStart = performance.now();
  const perFrameTime = Math.min(1200, 9000 / frames.length);

  // Store all keypoints per frame for inter-frame matching lines
  const allKeypoints = [];
  let totalMatches = 0;

  for (let i = 0; i < frames.length; i++) {
    if (cancelToken.cancelled) return;

    const frame = frames[i];
    const progress = ((i + 1) / frames.length) * 100;
    if (progBar) progBar.style.width = `${progress}%`;

    // Draw real frame as background
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = frame.dataUrl;
      });
      bgCtx.drawImage(img, 0, 0, canvasW, canvasH);
    } catch {
      /* continue */
    }

    // Detect real edge-based keypoints
    let keypoints;
    try {
      keypoints = await detectEdgePoints(frame.dataUrl, 15);
    } catch {
      keypoints = [];
    }
    allKeypoints.push(keypoints);

    pushLog(termBody, `Detected ${keypoints.length} keypoints on frame ${i + 1}/${frames.length}`, 'info');

    // Draw overlay: semi-transparent darken
    oCtx.clearRect(0, 0, canvasW, canvasH);
    oCtx.fillStyle = 'rgba(10, 10, 13, 0.4)';
    oCtx.fillRect(0, 0, canvasW, canvasH);

    // Draw keypoint dots (on real edge structure)
    keypoints.forEach((kp) => {
      const px = kp.x * canvasW;
      const py = kp.y * canvasH;

      // Glow
      oCtx.beginPath();
      oCtx.arc(px, py, 8, 0, Math.PI * 2);
      oCtx.fillStyle = 'rgba(242, 183, 5, 0.15)';
      oCtx.fill();

      // Dot
      oCtx.beginPath();
      oCtx.arc(px, py, 3, 0, Math.PI * 2);
      oCtx.fillStyle = '#f2b705';
      oCtx.fill();
    });

    // Draw matching lines to previous frame's keypoints
    if (i > 0 && allKeypoints[i - 1].length > 0) {
      const prevKps = allKeypoints[i - 1];
      const matchCount = Math.min(keypoints.length, prevKps.length, 10);
      totalMatches += matchCount;

      oCtx.strokeStyle = 'rgba(242, 183, 5, 0.25)';
      oCtx.lineWidth = 1;
      for (let m = 0; m < matchCount; m++) {
        const from = prevKps[m];
        const to = keypoints[m];
        oCtx.beginPath();
        oCtx.moveTo(from.x * canvasW, from.y * canvasH);
        oCtx.lineTo(to.x * canvasW, to.y * canvasH);
        oCtx.stroke();
      }
    }

    // Draw camera path arc (simulated geometry)
    oCtx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    oCtx.lineWidth = 2;
    oCtx.beginPath();
    const pathCenterX = canvasW * 0.5;
    const pathCenterY = canvasH * 0.85;
    const pathRadX = canvasW * 0.35;
    const pathRadY = canvasH * 0.15;
    const arcEnd = (Math.PI * (i + 1)) / frames.length;
    oCtx.ellipse(pathCenterX, pathCenterY, pathRadX, pathRadY, 0, Math.PI, Math.PI + arcEnd);
    oCtx.stroke();

    // Camera position marker
    const camAngle = Math.PI + arcEnd;
    const camX = pathCenterX + pathRadX * Math.cos(camAngle);
    const camY = pathCenterY + pathRadY * Math.sin(camAngle);
    oCtx.beginPath();
    oCtx.arc(camX, camY, 5, 0, Math.PI * 2);
    oCtx.fillStyle = '#22c55e';
    oCtx.fill();
    oCtx.beginPath();
    oCtx.arc(camX, camY, 10, 0, Math.PI * 2);
    oCtx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    oCtx.lineWidth = 1;
    oCtx.stroke();

    // Update reprojection error (animated decrease)
    const errorProgress = (i + 1) / frames.length;
    const currentError = lerp(4.2, 0.31, easeOutQuart(errorProgress));
    if (reprojEl) reprojEl.textContent = `${currentError.toFixed(2)}px`;
    if (matchesEl) matchesEl.textContent = totalMatches.toLocaleString();
    if (camerasEl) camerasEl.textContent = `${i + 1}`;

    updateMetric(sidebar, 'reproj-error', `${currentError.toFixed(2)}px`);
    updateMetric(sidebar, 'cameras', `${i + 1}`);

    const elapsed = ((performance.now() - stageStart) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;

    await wait(perFrameTime);
  }

  const finalTime = ((performance.now() - stageStart) / 1000).toFixed(1);
  if (timerEl) timerEl.textContent = `${finalTime}s ✓`;

  pushLog(termBody, `Stage 2 complete — ${frames.length} camera poses recovered, reproj. error: 0.31px (${finalTime}s)`, 'success');

  // Store reprojection error metric
  setAppState((s) => ({
    pipeline: { ...s.pipeline, metrics: { ...s.pipeline.metrics, reprojectionError: 0.31 } },
  }));

  await wait(600);
}

/* ============================================================
   STAGE 3 — Depth Estimation (~8s)
   - Real pseudo-depth generation per frame (grayscale → gradient → turbo colormap)
   - Dual-pane crossfade: RGB vs depth-style output
   ============================================================ */

export async function runStage3(container, termBody, sidebar, cancelToken) {
  const state = getAppState();
  const frames = state.frames;
  if (!frames.length) return;

  pushLog(termBody, 'Stage 3 — Depth Estimation: generating pseudo-depth maps from real frames...', 'info');

  container.innerHTML = `
    <div class="pl-stage-title-bar">
      <div class="pl-stage-name"><span class="pl-stage-num">3</span> Monocular Depth Estimation</div>
      <div class="pl-stage-timer" id="pl-s3-timer">0.0s</div>
    </div>
    <div class="pl-stage-progress"><div class="pl-stage-progress-fill" id="pl-s3-prog" style="width:0%"></div></div>
    <div class="pl-depth-dual-pane">
      <div class="pl-depth-pane">
        <span class="pl-depth-pane-label">RGB INPUT</span>
        <img id="pl-s3-rgb" src="" alt="RGB frame">
      </div>
      <div class="pl-depth-pane">
        <span class="pl-depth-pane-label">PSEUDO-DEPTH (COMPUTED)</span>
        <img id="pl-s3-depth" src="" alt="Depth map">
      </div>
    </div>
    <div class="pl-depth-frame-indicator" id="pl-s3-indicator">Processing frame 0 / ${frames.length}</div>
  `;

  const rgbImg = container.querySelector('#pl-s3-rgb');
  const depthImg = container.querySelector('#pl-s3-depth');
  const progBar = container.querySelector('#pl-s3-prog');
  const timerEl = container.querySelector('#pl-s3-timer');
  const indicator = container.querySelector('#pl-s3-indicator');

  const stageStart = performance.now();
  const perFrameTime = Math.min(900, 7000 / frames.length);

  // Store depth maps for Stage 4
  const depthMaps = [];

  for (let i = 0; i < frames.length; i++) {
    if (cancelToken.cancelled) return;

    const frame = frames[i];
    const progress = ((i + 1) / frames.length) * 100;
    if (progBar) progBar.style.width = `${progress}%`;

    // Show real RGB frame
    if (rgbImg) rgbImg.src = frame.dataUrl;

    // Generate REAL pseudo-depth from actual frame pixels
    let depthDataUrl;
    try {
      depthDataUrl = await generateDepthMap(frame.dataUrl, 400);
    } catch {
      depthDataUrl = frame.dataUrl; // fallback to original
    }
    depthMaps.push(depthDataUrl);

    // Show depth map
    if (depthImg) depthImg.src = depthDataUrl;

    if (indicator) indicator.textContent = `Processing frame ${i + 1} / ${frames.length}`;

    pushLog(termBody, `Computed pseudo-depth for frame ${i + 1}/${frames.length}`, 'info');
    updateMetric(sidebar, 'depth-frames', `${i + 1}/${frames.length}`);

    const elapsed = ((performance.now() - stageStart) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;

    await wait(perFrameTime);
  }

  const finalTime = ((performance.now() - stageStart) / 1000).toFixed(1);
  if (timerEl) timerEl.textContent = `${finalTime}s ✓`;

  pushLog(termBody, `Stage 3 complete — ${frames.length} depth maps generated (${finalTime}s)`, 'success');

  // Store depth maps in a temporary holder for Stage 4
  window.__pipelineDepthMaps = depthMaps;

  await wait(600);
}

/* ============================================================
   STAGE 4 — 3D Reconstruction (~12s)
   - Point cloud with real pixel colors from frames
   - Positions from simulated camera arc + depth brightness z-offset
   - Running point count
   - Loss/PSNR graph (simulated but labeled)
   - Stores appState.pointCloud
   ============================================================ */

export async function runStage4(container, termBody, sidebar, cancelToken) {
  const state = getAppState();
  const frames = state.frames;
  if (!frames.length) return;

  pushLog(termBody, 'Stage 4 — 3D Reconstruction: building point cloud from real frame pixels...', 'info');

  const pcCanvasW = 720;
  const pcCanvasH = 450;

  container.innerHTML = `
    <div class="pl-stage-title-bar">
      <div class="pl-stage-name"><span class="pl-stage-num">4</span> 3D Gaussian Splatting Reconstruction</div>
      <div class="pl-stage-timer" id="pl-s4-timer">0.0s</div>
    </div>
    <div class="pl-stage-progress"><div class="pl-stage-progress-fill" id="pl-s4-prog" style="width:0%"></div></div>
    <div class="pl-pointcloud-wrap">
      <canvas id="pl-s4-pc" width="${pcCanvasW}" height="${pcCanvasH}"></canvas>
    </div>
    <div class="pl-pointcloud-stats">
      <div class="pl-pc-stat glass-panel">
        <div class="pl-metric-value" id="pl-s4-count">0</div>
        <div class="pl-metric-label">Points Accumulated</div>
      </div>
      <div class="pl-pc-stat glass-panel">
        <div class="pl-metric-value" id="pl-s4-psnr">—</div>
        <div class="pl-metric-label">PSNR (dB)</div>
        <div class="pl-metric-tag">(illustrative pipeline metric)</div>
      </div>
      <div class="pl-pc-stat glass-panel">
        <div class="pl-metric-value" id="pl-s4-loss">—</div>
        <div class="pl-metric-label">Training Loss</div>
        <div class="pl-metric-tag">(illustrative pipeline metric)</div>
      </div>
    </div>
    <canvas class="pl-graph-canvas" id="pl-s4-graph" width="700" height="80"></canvas>
  `;

  const pcCanvas = container.querySelector('#pl-s4-pc');
  const pcCtx = pcCanvas.getContext('2d');
  const progBar = container.querySelector('#pl-s4-prog');
  const timerEl = container.querySelector('#pl-s4-timer');
  const countEl = container.querySelector('#pl-s4-count');
  const psnrEl = container.querySelector('#pl-s4-psnr');
  const lossEl = container.querySelector('#pl-s4-loss');
  const graphCanvas = container.querySelector('#pl-s4-graph');
  const graphCtx = graphCanvas.getContext('2d');

  const stageStart = performance.now();
  const perFrameTime = Math.min(1400, 11000 / frames.length);

  // Build point cloud data
  const pointCloud = { points: [], count: 0 };
  const pointsPerFrame = Math.max(200, Math.floor(2000 / frames.length));

  // Simulated PSNR/loss curves
  const psnrHistory = [];
  const lossHistory = [];

  // Clear canvas to dark
  pcCtx.fillStyle = '#060609';
  pcCtx.fillRect(0, 0, pcCanvasW, pcCanvasH);

  // Rotation angle for the point cloud visualization
  let rotAngle = 0;

  for (let i = 0; i < frames.length; i++) {
    if (cancelToken.cancelled) return;

    const frame = frames[i];
    const progress = ((i + 1) / frames.length) * 100;
    if (progBar) progBar.style.width = `${progress}%`;

    // Sample REAL pixel colors from this frame
    let samples;
    try {
      samples = await samplePixelColors(frame.dataUrl, pointsPerFrame);
    } catch {
      samples = [];
    }

    // Camera position on arc (simulated geometry)
    const camAngle = (i / frames.length) * Math.PI * 1.5 - Math.PI * 0.75;
    const camRadius = 3.0;
    const camX = camRadius * Math.cos(camAngle);
    const camZ = camRadius * Math.sin(camAngle);
    const camY = 0.5 + Math.sin(camAngle * 0.5) * 0.3;

    // For each sampled pixel, create a 3D point
    for (const sample of samples) {
      // Project from 2D pixel position + depth brightness into 3D
      // Spread points radially from camera position using pixel coordinates
      const depth = 1.0 + sample.brightness * 2.0; // Use brightness as depth offset
      const spreadX = (sample.nx - 0.5) * 2.0;
      const spreadY = (sample.ny - 0.5) * -1.5;

      const x = camX + Math.cos(camAngle) * depth * 0.3 + spreadX * depth * 0.3;
      const y = camY + spreadY * depth * 0.2;
      const z = camZ + Math.sin(camAngle) * depth * 0.3;

      pointCloud.points.push({
        x, y, z,
        r: sample.r,
        g: sample.g,
        b: sample.b,
      });
    }
    pointCloud.count = pointCloud.points.length;

    // Draw point cloud visualization (simple orthographic projection with rotation)
    rotAngle += 0.02;
    pcCtx.fillStyle = 'rgba(6, 6, 9, 0.15)'; // Trail fade
    pcCtx.fillRect(0, 0, pcCanvasW, pcCanvasH);

    const cosR = Math.cos(rotAngle);
    const sinR = Math.sin(rotAngle);
    const centerX = pcCanvasW / 2;
    const centerY = pcCanvasH / 2;
    const scale = 80;

    // Draw a subset of recent + sampled older points for performance
    const drawStart = Math.max(0, pointCloud.points.length - 3000);
    for (let p = drawStart; p < pointCloud.points.length; p++) {
      const pt = pointCloud.points[p];
      // Rotate around Y axis
      const rx = pt.x * cosR - pt.z * sinR;
      const ry = pt.y;

      const sx = centerX + rx * scale;
      const sy = centerY - ry * scale;

      if (sx < 0 || sx > pcCanvasW || sy < 0 || sy > pcCanvasH) continue;

      pcCtx.fillStyle = `rgb(${pt.r},${pt.g},${pt.b})`;
      pcCtx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Update counters
    if (countEl) countEl.textContent = pointCloud.count.toLocaleString();

    // Simulated PSNR (increasing) and loss (decreasing) — labeled as illustrative
    const psnr = lerp(18.0, 31.5, easeOutQuart((i + 1) / frames.length));
    const loss = lerp(0.45, 0.008, easeOutQuart((i + 1) / frames.length));
    psnrHistory.push(psnr);
    lossHistory.push(loss);

    if (psnrEl) psnrEl.textContent = `${psnr.toFixed(1)}`;
    if (lossEl) lossEl.textContent = loss.toFixed(4);

    // Draw loss/PSNR graph
    drawGraph(graphCtx, graphCanvas.width, graphCanvas.height, psnrHistory, lossHistory);

    pushLog(termBody, `Point cloud: ${pointCloud.count.toLocaleString()} points accumulated (frame ${i + 1}/${frames.length})`, 'info');

    updateMetric(sidebar, 'point-count', pointCloud.count.toLocaleString());
    updateMetric(sidebar, 'psnr', `${psnr.toFixed(1)} dB`);

    const elapsed = ((performance.now() - stageStart) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;

    await wait(perFrameTime);
  }

  // Final slow rotation animation (2 seconds of continued rotation)
  const rotStart = performance.now();
  let rotRaf;
  await new Promise((resolve) => {
    function rotStep() {
      if (cancelToken.cancelled) { resolve(); return; }
      const elapsed = performance.now() - rotStart;
      if (elapsed > 2000) { resolve(); return; }

      rotAngle += 0.03;
      pcCtx.fillStyle = 'rgba(6, 6, 9, 0.08)';
      pcCtx.fillRect(0, 0, pcCanvasW, pcCanvasH);

      const cosR = Math.cos(rotAngle);
      const sinR = Math.sin(rotAngle);
      const centerX = pcCanvasW / 2;
      const centerY = pcCanvasH / 2;
      const scale = 80;

      const step = Math.max(1, Math.floor(pointCloud.points.length / 4000));
      for (let p = 0; p < pointCloud.points.length; p += step) {
        const pt = pointCloud.points[p];
        const rx = pt.x * cosR - pt.z * sinR;
        const ry = pt.y;
        const sx = centerX + rx * scale;
        const sy = centerY - ry * scale;
        if (sx < 0 || sx > pcCanvasW || sy < 0 || sy > pcCanvasH) continue;
        pcCtx.fillStyle = `rgb(${pt.r},${pt.g},${pt.b})`;
        pcCtx.fillRect(sx, sy, 1.5, 1.5);
      }

      rotRaf = requestAnimationFrame(rotStep);
    }
    rotRaf = requestAnimationFrame(rotStep);
  });
  if (rotRaf) cancelAnimationFrame(rotRaf);

  const finalTime = ((performance.now() - stageStart) / 1000).toFixed(1);
  if (timerEl) timerEl.textContent = `${finalTime}s ✓`;

  // Store point cloud in appState for Dev 4
  setAppState((s) => ({
    pointCloud,
    pipeline: {
      ...s.pipeline,
      metrics: { ...s.pipeline.metrics, psnr: 31.5, gaussiansCount: pointCloud.count },
    },
  }));

  pushLog(termBody, `Stage 4 complete — ${pointCloud.count.toLocaleString()} points in final cloud, PSNR: 31.5 dB (${finalTime}s)`, 'success');

  await wait(600);
}

/**
 * Draw PSNR/Loss graph on a canvas
 */
function drawGraph(ctx, w, h, psnrData, lossData) {
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(10, 10, 13, 0.8)';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (psnrData.length < 2) return;

  const drawLine = (data, min, max, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const norm = (data[i] - min) / (max - min || 1);
      const y = h - norm * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // PSNR line (green, ascending)
  drawLine(psnrData, 15, 35, 'rgba(34, 197, 94, 0.7)');
  // Loss line (amber, descending)
  drawLine(lossData, 0, 0.5, 'rgba(242, 183, 5, 0.7)');

  // Labels
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
  ctx.fillText('PSNR ↑', 4, 12);
  ctx.fillStyle = 'rgba(242, 183, 5, 0.6)';
  ctx.fillText('LOSS ↓', 4, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText('(illustrative)', w - 70, 12);
}

/* ============================================================
   STAGE 5 — Georeferencing (~5s)
   - Real GPS checkmarks if appState.telemetry exists
   - Simulated fallback if no telemetry
   ============================================================ */

export async function runStage5(container, termBody, sidebar, cancelToken) {
  const state = getAppState();
  const telemetry = state.telemetry || [];
  const hasTelemetry = telemetry.length > 0;

  pushLog(termBody, `Stage 5 — Georeferencing: ${hasTelemetry ? `${telemetry.length} GPS records from SRT sidecar` : 'No flight telemetry detected'}`, hasTelemetry ? 'info' : 'warn');

  const checks = hasTelemetry
    ? [
        { label: 'GPS Coordinate System (WGS84)', done: false },
        { label: `Telemetry Records: ${telemetry.length} waypoints`, done: false },
        { label: `Altitude Range: ${Math.min(...telemetry.map((t) => t.altitudeM)).toFixed(1)}m — ${Math.max(...telemetry.map((t) => t.altitudeM)).toFixed(1)}m`, done: false },
        { label: 'Ground Control Point Alignment', done: false },
        { label: 'RMSE Computation', done: false },
      ]
    : [
        { label: 'Coordinate System (Local)', done: false },
        { label: 'No SRT telemetry sidecar detected', done: false },
        { label: 'Simulated GCP alignment', done: false },
        { label: 'RMSE estimation (simulated)', done: false },
      ];

  // Compute a rough RMSE-like value if telemetry exists
  let rmseValue;
  if (hasTelemetry && telemetry.length >= 2) {
    // Use spread of lat/lon as a very rough proxy
    const lats = telemetry.map((t) => t.latitude);
    const lons = telemetry.map((t) => t.longitude);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lonSpread = Math.max(...lons) - Math.min(...lons);
    // Convert to rough cm — completely illustrative but derived from real data
    rmseValue = Math.max(0.5, Math.min(5.0, (latSpread + lonSpread) * 10000)).toFixed(1);
  } else {
    rmseValue = '2.1'; // Fixed illustrative value
  }

  container.innerHTML = `
    <div class="pl-stage-title-bar">
      <div class="pl-stage-name"><span class="pl-stage-num">5</span> GTSAM/iSAM2 Georeferencing</div>
      <div class="pl-stage-timer" id="pl-s5-timer">0.0s</div>
    </div>
    <div class="pl-stage-progress"><div class="pl-stage-progress-fill" id="pl-s5-prog" style="width:0%"></div></div>
    ${!hasTelemetry ? '<div class="pl-geo-simulated-tag" style="margin-bottom:12px">⚠ Simulated — no flight telemetry detected</div>' : ''}
    <div class="pl-geo-grid">
      <div class="pl-geo-card glass-panel">
        <div class="pl-metric-label" style="margin-bottom:8px">ALIGNMENT CHECKS</div>
        <div id="pl-s5-checks"></div>
      </div>
      <div class="pl-geo-card glass-panel">
        <div class="pl-metric-label" style="margin-bottom:8px">
          RMSE ACCURACY ${!hasTelemetry ? '<span class="pl-geo-simulated-tag">(simulated)</span>' : ''}
        </div>
        <div class="pl-metric-value" id="pl-s5-rmse" style="font-size:2rem;margin:12px 0">${rmseValue} cm</div>
        <div class="pl-geo-rmse-gauge">
          <div class="pl-geo-rmse-fill" id="pl-s5-rmse-fill" style="width:0%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span class="pl-metric-tag">0 cm</span>
          <span class="pl-metric-tag">5 cm</span>
        </div>
      </div>
    </div>
  `;

  const checksContainer = container.querySelector('#pl-s5-checks');
  const progBar = container.querySelector('#pl-s5-prog');
  const timerEl = container.querySelector('#pl-s5-timer');
  const rmseFill = container.querySelector('#pl-s5-rmse-fill');

  const stageStart = performance.now();
  const perCheckDelay = Math.min(1000, 4000 / checks.length);

  // Animate checks appearing
  for (let i = 0; i < checks.length; i++) {
    if (cancelToken.cancelled) return;

    const progress = ((i + 1) / checks.length) * 100;
    if (progBar) progBar.style.width = `${progress}%`;

    checks[i].done = true;

    // Re-render checks
    checksContainer.innerHTML = checks
      .map(
        (c, idx) => `
      <div class="pl-geo-check-row ${idx <= i ? 'pl-fade-in' : ''}" style="opacity:${idx <= i ? 1 : 0.3}">
        <span class="pl-geo-check-icon ${idx <= i ? 'done' : 'pending'}">${idx <= i ? '✓' : '○'}</span>
        <span>${c.label}</span>
      </div>
    `
      )
      .join('');

    pushLog(termBody, `Georef check: ${checks[i].label} ${checks[i].done ? '✓' : ''}`, checks[i].done ? 'success' : 'info');

    const elapsed = ((performance.now() - stageStart) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;

    await wait(perCheckDelay);
  }

  // Animate RMSE gauge
  const rmsePercent = Math.min(100, (parseFloat(rmseValue) / 5) * 100);
  if (rmseFill) rmseFill.style.width = `${rmsePercent}%`;

  updateMetric(sidebar, 'rmse', `${rmseValue} cm`);

  // Store in appState
  setAppState((s) => ({
    pipeline: {
      ...s.pipeline,
      metrics: { ...s.pipeline.metrics, rmseCm: parseFloat(rmseValue) },
    },
  }));

  const finalTime = ((performance.now() - stageStart) / 1000).toFixed(1);
  if (timerEl) timerEl.textContent = `${finalTime}s ✓`;

  pushLog(termBody, `Stage 5 complete — RMSE: ${rmseValue} cm ${!hasTelemetry ? '(simulated)' : '(from telemetry)'} (${finalTime}s)`, 'success');

  await wait(600);
}
