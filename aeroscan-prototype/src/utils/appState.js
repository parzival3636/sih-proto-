/* ============================================================
   AEROSCAN-3D / UNIPASS-3D — Shared Application State (Pub/Sub)
   Single source of truth holding real uploaded video data,
   extracted metadata, real video frames, and pipeline status.
   ============================================================

   STATE CONTRACT SHAPE:
   {
     videoFile: File | null,               // The raw user-uploaded video File object
     videoUrl: string | null,              // Blob URL (URL.createObjectURL) for video element playback
     video: {                              // Unified alias object for downstream developers
       file: File | null,
       url: string | null,
       name: string,
       duration: number,
       width: number,
       height: number,
       resolution: string,
       sizeFormatted: string
     } | null,
     metadata: {
       name: string,                       // e.g. "DJI_0042_SURVEY.MP4"
       sizeBytes: number,                  // e.g. 48291040
       formattedSize: string,              // e.g. "46.1 MB"
       type: string,                       // e.g. "video/mp4"
       durationSec: number,                // e.g. 18.42
       formattedDuration: string,          // e.g. "00:18"
       width: number,                      // e.g. 3840
       height: number,                     // e.g. 2160
       resolution: string,                 // e.g. "4K UHD (3840x2160)"
       fpsEstimate: number,                // e.g. 30
       totalFramesEstimate: number,        // e.g. 552
       lastModified: number                // Unix timestamp
     } | null,
     frames: Array<{                       // Real extracted frame snapshots from the uploaded video
       index: number,
       timestampSec: number,
       dataUrl: string,                    // Base64 JPEG data URL captured via Canvas.drawImage
       width: number,
       height: number
     }>,
     telemetry: Array<{                    // Real GPS & altitude telemetry parsed from .SRT sidecar if provided
       timeSec: number,
       latitude: number,
       longitude: number,
       altitudeM: number,
       raw: string
     }>,
     config: {                             // Ingestion flags read by Dev 3
       processingMode: string,             // 'standard' | 'high-accuracy' | 'tactical-fast'
       gaussianDensity: string,            // 'standard' | 'ultra-8.3m'
       dynamicMasking: boolean,            // SAM2 dynamic object masking
       gtsamOptimization: boolean,         // iSAM2 pose-graph refinement
       siteIdentifier: string
     },
     pipeline: {
       isProcessing: boolean,
       isCompleted: boolean,
       currentStage: number,               // 1 to 5
       stageProgress: number,              // 0 to 100
       overallProgress: number,            // 0 to 100
       activeStageName: string,
       metrics: {
         reprojectionError: number | null,
         gaussiansCount: number | null,
         psnr: number | null,
         rmseCm: number | null
       },
       logs: Array<{ timestamp: string, text: string, level: 'info'|'warn'|'success' }>
     },
     activeMissionId: string | null
   }
   ============================================================ */

const initialAppState = {
  videoFile: null,
  videoUrl: null,
  video: null,
  metadata: null,
  frames: [],
  telemetry: [],
  config: {
    processingMode: 'high-accuracy',
    gaussianDensity: 'ultra-8.3m',
    dynamicMasking: true,
    gtsamOptimization: true,
    siteIdentifier: 'ALPHA_RECON_SECTOR_04',
  },
  pipeline: {
    isProcessing: false,
    isCompleted: false,
    currentStage: 1,
    stageProgress: 0,
    overallProgress: 0,
    activeStageName: 'Idle',
    metrics: {
      reprojectionError: null,
      gaussiansCount: null,
      psnr: null,
      rmseCm: null,
    },
    logs: [],
  },
  activeMissionId: null,
};

// Global in-memory state singleton
let state = { ...initialAppState };

// Pub/Sub listeners set
const listeners = new Set();

/**
 * Get a read-only snapshot of current app state
 * @returns {typeof initialAppState}
 */
export function getAppState() {
  return state;
}

/**
 * Update partial state and notify all subscribers
 * @param {Partial<typeof initialAppState> | ((prevState: typeof initialAppState) => Partial<typeof initialAppState>)} updater
 */
export function setAppState(updater) {
  const partial = typeof updater === 'function' ? updater(state) : updater;
  
  // Maintain convenient video alias if metadata or videoUrl updated
  let videoObj = partial.video !== undefined ? partial.video : state.video;
  if (partial.metadata || partial.videoUrl || partial.videoFile) {
    const meta = partial.metadata || state.metadata;
    const url = partial.videoUrl || state.videoUrl;
    const file = partial.videoFile || state.videoFile;
    if (meta && url) {
      videoObj = {
        file,
        url,
        name: meta.name,
        duration: meta.durationSec,
        width: meta.width,
        height: meta.height,
        resolution: meta.resolution,
        sizeFormatted: meta.formattedSize,
      };
    }
  }

  state = {
    ...state,
    ...partial,
    video: videoObj,
    metadata: partial.metadata !== undefined ? partial.metadata : state.metadata,
    config: partial.config !== undefined ? { ...state.config, ...partial.config } : state.config,
    pipeline: partial.pipeline !== undefined ? { ...state.pipeline, ...partial.pipeline } : state.pipeline,
  };

  // Broadcast to all active subscribers
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.error('[AppState] Error in subscriber callback:', err);
    }
  });

  return state;
}

/**
 * Subscribe to state updates. Returns an unsubscribe function.
 * @param {(state: typeof initialAppState) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribeAppState(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reset application state (e.g. for new mission)
 */
export function resetAppState() {
  if (state.videoUrl) {
    URL.revokeObjectURL(state.videoUrl);
  }
  return setAppState({
    ...initialAppState,
    config: { ...initialAppState.config },
    pipeline: { ...initialAppState.pipeline, logs: [] },
  });
}
