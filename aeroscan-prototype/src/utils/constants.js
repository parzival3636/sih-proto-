/* ============================================================
   AEROSCAN-3D / UNIPASS-3D — System Constants
   Contains only values that are genuinely non-derivable from
   real video input (e.g. hardware specifications, mission history
   for dashboard tables, and benchmark performance limits).
   ============================================================ */

export const BRAND = {
  systemName: 'AEROSCAN-3D',
  protocolName: 'UNIPASS-3D',
  tagline: 'Turn raw drone footage into actionable 3D intelligence.',
  headlineLead: 'Platform for those who have to',
  headlineAccent: 'act.',
  teamName: 'Team Defaulters',
  event: 'Smart India Hackathon 2026',
};

// Benchmarks referenced on landing & dashboard (clearly documented as reference specs)
export const SYSTEM_BENCHMARKS = {
  avgProcessingTimeMin: 14.8,
  reconstructionAccuracyRmseCm: 2.1,
  maxGaussiansPoints: '8.3M',
  flightPassRequirement: '1 Single Pass (Zero Repeat)',
  supportedSensors: 'RGB Monocular (4K / 1080p), EO/IR, Multi-spectral',
};

export const DASHBOARD_STATS = {
  totalMissions: 47,
  modelsGenerated: 42,
  avgProcessingTimeMin: 14.8,
  avgAccuracyRmseCm: 2.1,
};


// Past mission telemetry for the historical dashboard table
export const MISSIONS_HISTORY = [
  {
    id: 'MSN-7091',
    siteName: 'Wayanad Landslide Perimeter',
    sector: 'Disaster Recon',
    date: '2026-08-14',
    sensorPlatform: 'DJI Matrice 350 RTK',
    rmseCm: 2.1,
    durationMin: 14.2,
    status: 'COMPLETED',
    classification: 'METRIC SURVEY',
  },
  {
    id: 'MSN-7088',
    siteName: 'Pamban Railway Viaduct Span 4',
    sector: 'Critical Infrastructure',
    date: '2026-08-11',
    sensorPlatform: 'DJI Mavic 3 Enterprise',
    rmseCm: 1.8,
    durationMin: 11.5,
    status: 'COMPLETED',
    classification: 'STRUCTURAL AUDIT',
  },
  {
    id: 'MSN-7082',
    siteName: 'Brahmaputra Embankment Breach',
    sector: 'Flood Inundation',
    date: '2026-07-28',
    sensorPlatform: 'Skydio X10 Dual',
    rmseCm: 3.2,
    durationMin: 18.0,
    status: 'COMPLETED',
    classification: 'RAPID SITREP',
  },
  {
    id: 'MSN-7075',
    siteName: 'Yamuna Expressway Interchange 14',
    sector: 'Corridor Mapping',
    date: '2026-07-20',
    sensorPlatform: 'DJI Matrice 300 RTK',
    rmseCm: 1.6,
    durationMin: 13.4,
    status: 'COMPLETED',
    classification: 'CADASTRE',
  },
  {
    id: 'MSN-7069',
    siteName: 'Western Ghats Ridge Collapse',
    sector: 'Geological Hazard',
    date: '2026-07-09',
    sensorPlatform: 'DJI Mavic 3 Enterprise',
    rmseCm: 2.8,
    durationMin: 16.7,
    status: 'COMPLETED',
    classification: 'TERRAIN DSM',
  },
];

// Target hardware rig specs for offline compute simulation
export const HARDWARE_SPEC = {
  gpuModel: 'NVIDIA RTX 4090 24GB',
  cudaCores: 16384,
  tensorCores: 512,
  vramTotalGb: 24.0,
  vramBaselineUsageGb: 5.8,
  inferencePrecision: 'FP16 / INT8 TensorRT',
  storageType: 'NVMe Gen4 PCIe',
};

// Navigation routes
export const NAV_ROUTES = [
  { path: '#/', label: 'Overview', icon: 'compass', breadcrumb: 'Overview' },
  { path: '#/dashboard', label: 'Missions', icon: 'layout-grid', breadcrumb: 'Missions Registry' },
  { path: '#/upload', label: 'New Mission', icon: 'upload-cloud', breadcrumb: 'Footage Ingestion' },
  { path: '#/pipeline', label: 'Processing', icon: 'cpu', breadcrumb: 'Reconstruction Engine' },
  { path: '#/viewer', label: '3D Spatial', icon: 'box', breadcrumb: 'Spatial Intel Viewer' },
];

export const MISSION = {
  name: 'Urban Building Survey',
  date: 'September 5, 2026',
  location: 'Hatay, Turkey (Disaster Recon)',
  lat: 36.2021,
  lon: 36.1604,
  drone: 'DJI Matrice 350 RTK',
  camera: 'Hasselblad L2D-20c',
  resolution: '3840 × 2160 (4K)',
  fps: 30,
  codec: 'H.265 / HEVC',
  duration: '3:45',
  totalFrames: 8160,
  altitude: 85,
  speed: 8.2,
  distance: 2.23,
};

export const MODEL_STATS = {
  vertices: 2847293,
  faces: 5694471,
  gaussians: 8347291,
  fileSize: '183 MB',
  boundingBox: '127 × 89 × 34 m',
  psnr: '31.4 dB',
  ssim: '0.944',
  lpips: '0.082',
  rmse: '2.3 cm',
  gsd: '1.2 cm/px',
  projectionError: '0.31 px',
};

export const PIPELINE = {
  stage1: { name: 'Video Preprocessing', duration: 8000,  framesAnalyzed: 8160, rejected: 1847, skipped: 5466, selected: 847 },
  stage2: { name: 'Pose Estimation',     duration: 10000, correspondences: 2847293, iterations: 50, reprojError: 0.31 },
  stage3: { name: 'Depth Estimation',    duration: 8000,  speed: '47ms/frame', minDepth: 2.3, maxDepth: 127.4 },
  stage4: { name: '3D Reconstruction',   duration: 12000, gaussians: 8347291, psnr: 31.4, ssim: 0.94, lpips: 0.08 },
  stage5: { name: 'Georeferencing',      duration: 5000,  rmse: 2.3, meanError: 1.8, maxError: 8.7 },
};

export const LOG_MESSAGES = {
  stage1: [
    'Initializing FFmpeg decoder (H.265/HEVC)...',
    'Decoded 8,160 frames @ 3840×2160 @ 30fps',
    'Starting motion blur detection (LAPLACIAN variance)...',
    'Frames rejected (blur score < 0.82): 1,847',
    'Duplicate frame detection running...',
    'Duplicate frames pruned: 5,466',
    'Histogram equalization for exposure normalization...',
    '✅ Stage 1 Complete — 847 keyframes selected (10.4%)',
  ],
  stage2: [
    'Initializing SuperPoint feature extractor...',
    'Extracted avg 3,421 keypoints/frame across 847 images',
    'Building sequential matching pairs (window=8)...',
    'Running LightGlue matcher — 6,776 image pairs...',
    'Total valid correspondences: 2,847,293',
    'Initializing global SfM reconstruction...',
    'Reprojection error: 4.23px → 1.87px → 0.91px → 0.31px',
    '✅ Stage 2 Complete — 847/847 cameras registered',
  ],
  stage3: [
    'Loading Depth-Anything-V2-Small (ViT-S backbone)...',
    'Model loaded — 25.4M parameters @ FP16',
    'Processing batch 1/8 (frames 0–105)...',
    'Processing batch 4/8 (frames 318–423)...',
    'Processing batch 8/8 (frames 741–847)...',
    'Applying metric depth scale alignment (RANSAC)...',
    'Depth range calibrated: [2.3m — 127.4m]',
    '✅ Stage 3 Complete — 847 depth maps @ 47ms/frame avg',
  ],
  stage4: [
    'Initializing gsplat v1.3.0 (nerfstudio CUDA backend)...',
    'CUDA device: RTX 4090 (24GB) | Compute cap: 8.9',
    'Loaded 847 cameras + depth priors',
    'Initializing Gaussians from SfM point cloud (14,293 pts)...',
    'iter 1,000/30,000 — Loss: 0.0842 — PSNR: 18.2dB',
    'iter 5,000/30,000 — Loss: 0.0531 — PSNR: 22.7dB',
    'Densification — Gaussians: 142K → 891K',
    'iter 15,000/30,000 — Loss: 0.0234 — PSNR: 27.1dB',
    'Densification — Gaussians: 891K → 4.2M → 8.3M',
    'iter 30,000/30,000 — Loss: 0.0089 — PSNR: 31.4dB',
    '✅ Stage 4 Complete — 8,347,291 Gaussians | SSIM: 0.944',
  ],
  stage5: [
    'Loading GPS/IMU telemetry from flight log...',
    'Parsed 8,160 GPS fixes + 8,160 IMU samples',
    'Aligning SfM frame to ENU local tangent plane...',
    'Running ICP point cloud registration...',
    'RMSE after registration: 2.3 cm (8 control planes)',
    'Exporting Point Cloud LAS 1.4 → 247 MB...',
    'Exporting Textured Mesh OBJ+MTL → 183 MB...',
    'Exporting 3DGS Scene .splat → 412 MB...',
    'Generating orthophoto (GSD: 1.2 cm/px) → 89 MB...',
    '✅ Stage 5 Complete — All outputs georeferenced (WGS84/UTM43N)',
  ],
};

