/* ============================================================
   AEROSCAN-3D — Real Video Processing Utilities
   Operates strictly on actual uploaded video files.
   Extracts real duration, dimensions, metadata, and captures
   real frame images using HTML5 <video> and <canvas>.
   ============================================================ */

/**
 * Format bytes into human-readable string (KB, MB, GB)
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format seconds into MM:SS format
 * @param {number} totalSeconds 
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Estimate total frame count from duration and fps
 * @param {number} durationSec 
 * @param {number} fps 
 * @returns {number}
 */
export function estimateFrameCount(durationSec, fps = 30) {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.round(durationSec * fps);
}

/**
 * Extract real technical metadata from an uploaded video File object.
 * Loads the video file into a headless <video> element to probe intrinsic dimensions & duration.
 * 
 * @param {File} file - The uploaded video file
 * @returns {Promise<{
 *   name: string,
 *   sizeBytes: number,
 *   formattedSize: string,
 *   type: string,
 *   durationSec: number,
 *   formattedDuration: string,
 *   width: number,
 *   height: number,
 *   resolution: string,
 *   fpsEstimate: number,
 *   totalFramesEstimate: number,
 *   lastModified: number,
 *   objectUrl: string
 * }>}
 */
export function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      return reject(new Error('Invalid file provided. Expected a File object.'));
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out reading video metadata. File may be corrupted or format unsupported.'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    }

    function onLoaded() {
      cleanup();
      const durationSec = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      let resolution = `${width}x${height}`;
      if (width >= 3840 || height >= 2160) {
        resolution = `4K UHD (${width}x${height})`;
      } else if (width >= 1920 || height >= 1080) {
        resolution = `1080p FHD (${width}x${height})`;
      } else if (width >= 1280 || height >= 720) {
        resolution = `720p HD (${width}x${height})`;
      }

      const fpsEstimate = 30; // standard drone camera framerate
      const totalFramesEstimate = estimateFrameCount(durationSec, fpsEstimate);

      resolve({
        name: file.name,
        sizeBytes: file.size,
        formattedSize: formatBytes(file.size),
        type: file.type || 'video/mp4',
        durationSec: Number(durationSec.toFixed(2)),
        formattedDuration: formatDuration(durationSec),
        width,
        height,
        resolution,
        fpsEstimate,
        totalFramesEstimate,
        lastModified: file.lastModified,
        objectUrl,
      });
    }

    function onError(e) {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video file: ${video.error ? video.error.message : 'Unknown error'}`));
    }

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });
}

/**
 * Extract real frame thumbnails from an actual video element or video URL
 * by seeking sequentially to target timestamps and capturing frames on a <canvas>.
 * 
 * @param {string | HTMLVideoElement} videoSource - Either a video object URL or an existing HTMLVideoElement
 * @param {number} count - Number of frames to extract (default 8)
 * @param {number} maxDimension - Max width or height of extracted thumbnail (default 640px for efficiency)
 * @param {(progress: { current: number, total: number, percent: number }) => void} [onProgress]
 * @returns {Promise<Array<{ index: number, timestampSec: number, dataUrl: string, width: number, height: number }>>}
 */
export async function extractFrames(videoSource, count = 8, maxDimension = 640, onProgress = null) {
  let video;
  let ownsVideo = false;

  if (typeof videoSource === 'string') {
    video = document.createElement('video');
    video.src = videoSource;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    ownsVideo = true;

    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Failed to load video source for frame extraction')), { once: true });
    });
  } else if (videoSource instanceof HTMLVideoElement) {
    video = videoSource;
  } else {
    throw new Error('videoSource must be a URL string or an HTMLVideoElement.');
  }

  const duration = video.duration;
  if (!duration || duration <= 0) {
    throw new Error('Invalid video duration for frame extraction.');
  }

  // Calculate scaled thumbnail dimensions preserving aspect ratio
  const origW = video.videoWidth || 1920;
  const origH = video.videoHeight || 1080;
  const scale = Math.min(1, maxDimension / Math.max(origW, origH));
  const thumbW = Math.round(origW * scale);
  const thumbH = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext('2d');

  // Compute evenly spaced timestamps across video duration
  const timestamps = [];
  const step = duration / (count + 1);
  for (let i = 1; i <= count; i++) {
    timestamps.push(Number((step * i).toFixed(2)));
  }

  const extracted = [];

  for (let i = 0; i < timestamps.length; i++) {
    const targetTime = timestamps[i];

    // Seek to timestamp and await seeked event
    await new Promise((resolve) => {
      function onSeeked() {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
      video.addEventListener('seeked', onSeeked);
      video.currentTime = targetTime;
    });

    // Draw real frame to canvas
    ctx.drawImage(video, 0, 0, thumbW, thumbH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    extracted.push({
      index: i + 1,
      timestampSec: targetTime,
      dataUrl,
      width: thumbW,
      height: thumbH,
    });

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: count,
        percent: Math.round(((i + 1) / count) * 100),
      });
    }
  }

  if (ownsVideo) {
    video.src = '';
    video.load();
  }

  return extracted;
}
