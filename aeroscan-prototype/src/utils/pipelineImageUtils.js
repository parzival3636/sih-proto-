/* ============================================================
   AEROSCAN-3D — Pipeline Image Processing Utilities
   All functions operate on REAL frame dataUrl strings from
   appState.frames via offscreen <canvas> pixel manipulation.
   No external libraries — pure JS + Canvas2D.
   ============================================================ */

/**
 * Load an image from a dataUrl into an HTMLImageElement.
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from dataUrl'));
    img.src = dataUrl;
  });
}

/**
 * Draw a dataUrl image onto an offscreen canvas at the given size.
 * Returns { canvas, ctx, width, height }.
 * @param {string} dataUrl
 * @param {number} w  - Target width
 * @param {number} h  - Target height
 * @returns {Promise<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number}>}
 */
async function drawToCanvas(dataUrl, w, h) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, width: w, height: h };
}

/**
 * Convert RGBA pixel data to grayscale Float32Array.
 * Uses luminance weights: 0.299R + 0.587G + 0.114B
 * @param {Uint8ClampedArray} data - RGBA pixel data
 * @param {number} w
 * @param {number} h
 * @returns {Float32Array}
 */
function toGrayscale(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

/* ============================================================
   1. BLUR DETECTION — Laplacian Variance
   Approximates image sharpness by computing the variance of a
   Laplacian-convolved grayscale image. Higher = sharper.
   ============================================================ */

/**
 * Compute a blur/sharpness score for a real frame.
 * Returns { score: number, isSharp: boolean }
 * Score > threshold → sharp; below → blurry.
 *
 * @param {string} dataUrl - Real frame dataUrl from appState.frames
 * @param {number} [threshold=12] - Score threshold for sharp classification
 * @returns {Promise<{score: number, isSharp: boolean}>}
 */
export async function computeBlurScore(dataUrl, threshold = 12) {
  // Downscale to 64x64 for speed — still captures blur characteristics
  const { ctx, width: w, height: h } = await drawToCanvas(dataUrl, 64, 64);
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData.data, w, h);

  // 3×3 Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const laplacian =
        gray[idx - w] +           // top
        gray[idx - 1] +           // left
        -4 * gray[idx] +          // center
        gray[idx + 1] +           // right
        gray[idx + w];            // bottom

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  // Variance = E[X²] - (E[X])²
  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  const score = Math.sqrt(variance); // Std-dev as the final score

  return {
    score: Number(score.toFixed(2)),
    isSharp: score >= threshold,
  };
}

/* ============================================================
   2. EDGE POINT DETECTION — Sobel Gradient Sampling
   Finds "interesting" points in a real frame by running a
   Sobel-like gradient pass and sampling the brightest edge pixels.
   Points land on real image structure, not random positions.
   ============================================================ */

/**
 * Detect edge keypoints in a real frame image.
 * Returns an array of {x, y, strength} in normalized [0..1] coordinates.
 *
 * @param {string} dataUrl - Real frame dataUrl
 * @param {number} [count=20] - Number of keypoints to return
 * @param {number} [resolution=128] - Internal processing resolution
 * @returns {Promise<Array<{x: number, y: number, strength: number}>>}
 */
export async function detectEdgePoints(dataUrl, count = 20, resolution = 128) {
  const w = resolution;
  const h = Math.round(resolution * 0.5625); // 16:9 aspect
  const { ctx } = await drawToCanvas(dataUrl, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData.data, w, h);

  // Compute Sobel gradient magnitude
  const gradients = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // Sobel X: [-1, 0, 1], [-2, 0, 2], [-1, 0, 1]
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] +
        -2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)] +
        -gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      // Sobel Y: [-1, -2, -1], [0, 0, 0], [1, 2, 1]
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      gradients.push({ x: x / w, y: y / h, strength: magnitude });
    }
  }

  // Sort by strength descending, take top N with spatial spread
  gradients.sort((a, b) => b.strength - a.strength);

  const selected = [];
  const minDist = 0.06; // Minimum distance between keypoints (normalized)

  for (const pt of gradients) {
    if (selected.length >= count) break;
    // Enforce minimum spatial distance to avoid clustering
    const tooClose = selected.some(
      (s) => Math.hypot(s.x - pt.x, s.y - pt.y) < minDist
    );
    if (!tooClose) {
      selected.push(pt);
    }
  }

  return selected;
}

/* ============================================================
   3. PSEUDO-DEPTH MAP — Gradient Magnitude + Turbo Colormap
   Produces a colorized "depth-style" image from a real frame.
   Process: grayscale → gradient magnitude → turbo LUT → RGBA
   ============================================================ */

/**
 * Hand-written Turbo colormap LUT (256 entries).
 * Maps scalar intensity [0..255] → [r, g, b].
 * Approximation of the Turbo colormap (Mikhailov 2019).
 */
function turboColormap(t) {
  // t in [0..1]
  const r = Math.max(0, Math.min(255, Math.round(
    34.61 + t * (1172.33 + t * (-10793.56 + t * (33300.12 + t * (-38394.49 + t * 14825.05))))
  )));
  const g = Math.max(0, Math.min(255, Math.round(
    23.31 + t * (557.33 + t * (1225.33 + t * (-8574.70 + t * (12030.49 + t * (-5765.01)))))
  )));
  const b = Math.max(0, Math.min(255, Math.round(
    27.2 + t * (3211.1 + t * (-15327.97 + t * (27814.0 + t * (-22569.18 + t * 6838.66))))
  )));
  return [r, g, b];
}

/** Build a cached 256-entry turbo LUT */
const TURBO_LUT = (() => {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = turboColormap(i / 255);
  }
  return lut;
})();

/**
 * Generate a pseudo-depth colormap image from a real frame.
 * Returns a dataUrl of the depth-style visualization.
 *
 * @param {string} dataUrl - Real frame dataUrl
 * @param {number} [outputWidth=320] - Output image width
 * @returns {Promise<string>} dataUrl of the depth-style image
 */
export async function generateDepthMap(dataUrl, outputWidth = 320) {
  const ow = outputWidth;
  const oh = Math.round(ow * 0.5625); // 16:9

  const { ctx, width: w, height: h } = await drawToCanvas(dataUrl, ow, oh);
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData.data, w, h);

  // Compute gradient magnitude (simplified Sobel)
  const gradMag = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + w] - gray[idx - w];
      const mag = Math.sqrt(gx * gx + gy * gy);
      gradMag[idx] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // Combine: use inverted grayscale + edge emphasis to create depth-like appearance
  // Dark/smooth regions → far (blue/purple), bright/edgy regions → near (red/yellow)
  const depthValues = new Float32Array(w * h);
  let dMin = Infinity, dMax = -Infinity;
  for (let i = 0; i < w * h; i++) {
    // Mix grayscale (inverted) with gradient magnitude for depth-like effect
    const grayNorm = gray[i] / 255;
    const edgeNorm = maxMag > 0 ? gradMag[i] / maxMag : 0;
    const depth = (1.0 - grayNorm) * 0.7 + edgeNorm * 0.3;
    depthValues[i] = depth;
    if (depth < dMin) dMin = depth;
    if (depth > dMax) dMax = depth;
  }

  // Normalize and apply turbo colormap
  const output = ctx.createImageData(w, h);
  const range = dMax - dMin || 1;
  for (let i = 0; i < w * h; i++) {
    const norm = (depthValues[i] - dMin) / range;
    const lutIdx = Math.max(0, Math.min(255, Math.round(norm * 255)));
    const [r, g, b] = TURBO_LUT[lutIdx];
    const off = i * 4;
    output.data[off] = r;
    output.data[off + 1] = g;
    output.data[off + 2] = b;
    output.data[off + 3] = 255;
  }

  ctx.putImageData(output, 0, 0);
  return ctx.canvas.toDataURL('image/jpeg', 0.9);
}

/* ============================================================
   4. PIXEL COLOR SAMPLING — For Point Cloud Construction
   Samples real pixel colors from a real frame for point cloud
   color assignment. Returns array of {r, g, b, x, y, brightness}.
   ============================================================ */

/**
 * Sample pixel colors from a real frame.
 *
 * @param {string} dataUrl - Real frame dataUrl
 * @param {number} [count=500] - Number of pixels to sample
 * @returns {Promise<Array<{r: number, g: number, b: number, nx: number, ny: number, brightness: number}>>}
 */
export async function samplePixelColors(dataUrl, count = 500) {
  const w = 320;
  const h = 180;
  const { ctx } = await drawToCanvas(dataUrl, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Stratified sampling: divide image into grid cells, sample from each
  const cellsX = Math.ceil(Math.sqrt(count * (w / h)));
  const cellsY = Math.ceil(count / cellsX);
  const cellW = w / cellsX;
  const cellH = h / cellsY;

  const samples = [];
  for (let cy = 0; cy < cellsY && samples.length < count; cy++) {
    for (let cx = 0; cx < cellsX && samples.length < count; cx++) {
      // Random point within the cell
      const px = Math.floor(cx * cellW + Math.random() * cellW);
      const py = Math.floor(cy * cellH + Math.random() * cellH);
      const clampedX = Math.min(px, w - 1);
      const clampedY = Math.min(py, h - 1);
      const idx = (clampedY * w + clampedX) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      samples.push({
        r, g, b,
        nx: clampedX / w,  // Normalized x [0..1]
        ny: clampedY / h,  // Normalized y [0..1]
        brightness,
      });
    }
  }

  return samples;
}

/* ============================================================
   5. DENSE GRID SAMPLING — For High-Accuracy Multi-Frame
   Reconstruction. Returns a structured grid of every pixel with
   color + estimated depth for proper 3D back-projection.
   ============================================================ */

/**
 * Dense grid sampling for multi-view stereo reconstruction.
 * Samples a regular grid of pixels from the frame and computes per-pixel
 * estimated depth using brightness, gradient magnitude, and local contrast.
 *
 * @param {string} dataUrl - Real frame dataUrl
 * @param {number} [gridW=80] - Grid width (columns)
 * @param {number} [gridH=45] - Grid height (rows)
 * @returns {Promise<{grid: Array, width: number, height: number}>}
 *   grid[row][col] = { r, g, b, nx, ny, brightness, depth, edgeStrength }
 */
export async function denseGridSample(dataUrl, gridW = 80, gridH = 45) {
  const w = gridW * 4;  // 320px sample resolution
  const h = gridH * 4;  // 180px sample resolution
  const { ctx } = await drawToCanvas(dataUrl, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Pre-compute full grayscale and gradient magnitude
  const gray = toGrayscale(data, w, h);

  // Compute Sobel gradient magnitude for edge/depth estimation
  const gradMag = new Float32Array(w * h);
  let maxGrad = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + w] - gray[idx - w];
      const mag = Math.sqrt(gx * gx + gy * gy);
      gradMag[idx] = mag;
      if (mag > maxGrad) maxGrad = mag;
    }
  }

  // Build grid
  const cellW = w / gridW;
  const cellH = h / gridH;
  const grid = [];

  for (let gy = 0; gy < gridH; gy++) {
    const row = [];
    for (let gx = 0; gx < gridW; gx++) {
      // Sample center of each cell
      const px = Math.min(Math.floor(gx * cellW + cellW / 2), w - 1);
      const py = Math.min(Math.floor(gy * cellH + cellH / 2), h - 1);
      const pixIdx = (py * w + px) * 4;

      const r = data[pixIdx];
      const g = data[pixIdx + 1];
      const b = data[pixIdx + 2];
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Edge strength at this pixel
      const edgeStrength = maxGrad > 0 ? gradMag[py * w + px] / maxGrad : 0;

      // Estimated depth: combine inverted brightness (dark = far, light = near)
      // with edge strength (strong edges = foreground objects, depth discontinuities)
      // This is a monocular depth heuristic: lower half of frame = closer (ground),
      // upper portion = farther (sky/background), modified by brightness.
      const verticalDepthBias = 1.0 - (gy / gridH); // bottom=1.0(near), top=0.0(far)
      const brightnessDepth = brightness * 0.6;      // brighter = nearer surfaces
      const edgeDepth = edgeStrength * 0.2;           // edges tend to be on foreground objects
      const depth = verticalDepthBias * 0.4 + brightnessDepth + edgeDepth;

      row.push({
        r, g, b,
        nx: gx / gridW,
        ny: gy / gridH,
        brightness,
        depth: Math.min(1.0, Math.max(0.0, depth)),
        edgeStrength,
      });
    }
    grid.push(row);
  }

  return { grid, width: gridW, height: gridH };
}

/**
 * Compute a per-pixel local depth field from a frame using multi-scale
 * gradient analysis. Returns a Float32Array of depth values [0..1].
 *
 * @param {string} dataUrl - Real frame dataUrl
 * @param {number} [resolution=160] - Processing resolution width
 * @returns {Promise<{depths: Float32Array, width: number, height: number}>}
 */
export async function computeLocalDepthField(dataUrl, resolution = 160) {
  const w = resolution;
  const h = Math.round(resolution * 0.5625);
  const { ctx } = await drawToCanvas(dataUrl, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData.data, w, h);

  // Multi-scale gradient: fine (1px) + coarse (3px)
  const depths = new Float32Array(w * h);
  let minD = Infinity, maxD = -Infinity;

  for (let y = 3; y < h - 3; y++) {
    for (let x = 3; x < w - 3; x++) {
      const idx = y * w + x;

      // Fine gradient (1px kernel)
      const gxF = gray[idx + 1] - gray[idx - 1];
      const gyF = gray[idx + w] - gray[idx - w];
      const fineEdge = Math.sqrt(gxF * gxF + gyF * gyF);

      // Coarse gradient (3px kernel)
      const gxC = gray[idx + 3] - gray[idx - 3];
      const gyC = gray[idx + 3 * w] - gray[idx - 3 * w];
      const coarseEdge = Math.sqrt(gxC * gxC + gyC * gyC);

      // Local contrast (variance in 5x5 neighborhood)
      let sum = 0, sumSq = 0, count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nIdx = (y + dy) * w + (x + dx);
          if (nIdx >= 0 && nIdx < w * h) {
            sum += gray[nIdx];
            sumSq += gray[nIdx] * gray[nIdx];
            count++;
          }
        }
      }
      const variance = (sumSq / count) - Math.pow(sum / count, 2);
      const localContrast = Math.sqrt(Math.max(0, variance)) / 255;

      // Combine: depth ~ inverted brightness + edge emphasis + contrast + vertical position
      const brightness = gray[idx] / 255;
      const vertBias = (1.0 - y / h) * 0.3; // top of frame = farther
      const edgeBias = (fineEdge / 255) * 0.25 + (coarseEdge / 255) * 0.15;
      const d = (1.0 - brightness) * 0.35 + edgeBias + localContrast * 0.15 + vertBias;

      depths[idx] = d;
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }
  }

  // Normalize to [0..1]
  const range = maxD - minD || 1;
  for (let i = 0; i < w * h; i++) {
    depths[i] = (depths[i] - minD) / range;
  }

  return { depths, width: w, height: h };
}

/**
 * Get the grayscale brightness at a normalized coordinate of a depth map.
 * Used by Stage 4 to derive z-offsets from the pseudo-depth image.
 *
 * @param {string} depthDataUrl - Depth map dataUrl from generateDepthMap()
 * @param {number} nx - Normalized x [0..1]
 * @param {number} ny - Normalized y [0..1]
 * @returns {Promise<number>} brightness in [0..1]
 */
export async function sampleDepthAt(depthDataUrl, nx, ny) {
  const { ctx, width: w, height: h } = await drawToCanvas(depthDataUrl, 80, 45);
  const px = Math.min(Math.floor(nx * w), w - 1);
  const py = Math.min(Math.floor(ny * h), h - 1);
  const pixel = ctx.getImageData(px, py, 1, 1).data;
  return (0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]) / 255;
}
