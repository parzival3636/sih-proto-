/* ============================================================
   UNIPASS-3D — Shared Mock Data & Constants
   Single source of truth for all developers
   ============================================================ */

export const BRAND = {
  systemName: 'UNIPASS-3D',
  tagline: 'Single-Pass Aerial 3D Reconstruction for Rapid Situational Awareness',
  teamName: 'Team Defaulters',
  event: 'Smart India Hackathon 2026',
};

export const TRUST_TAGS = ['Observed', 'Inferred', 'AI-Completed'];

export const PIPELINE_PHASES = [
  { id: 1, name: 'Flight & Capture', desc: 'One low pass. Single-pass mission captures video, GPS, and IMU data.', icon: 'plane' },
  { id: 2, name: 'Data Transfer', desc: 'Landing to processing, instantly. Footage moves offline to rig — no cloud needed.', icon: 'hard-drive-download' },
  { id: 3, name: 'Reconstruction Engine', desc: 'Raw footage becomes real geometry: motion, depth, and structure inferred frame-by-frame, fully offline.', icon: 'cpu' },
  { id: 4, name: 'Trust-Tagged Output', desc: 'Nothing hidden, nothing assumed. Every surface marked Observed, Inferred, or AI-Completed.', icon: 'shield-check' },
  { id: 5, name: 'Field Review & Decision', desc: 'Footage to decision, in minutes. Operator measures and verifies the model on-site.', icon: 'search' },
  { id: 6, name: 'Reporting & Archival', desc: 'The mission ends, the record doesn\u2019t. Outputs saved locally, shared when connectivity returns.', icon: 'archive' },
];

export const PROCESSING_STAGES = [
  { id: 1, name: 'Video Preparation', durationSec: 8,  totalFrames: 8160 },
  { id: 2, name: 'Pose Estimation',   durationSec: 10, reprojErrorStart: 4.2, reprojErrorEnd: 0.31 },
  { id: 3, name: 'Depth Estimation',  durationSec: 8 },
  { id: 4, name: '3D Reconstruction', durationSec: 12, gaussiansEnd: 8300000, psnrStart: 18.2, psnrEnd: 31.4 },
  { id: 5, name: 'Georeferencing',    durationSec: 5,  rmseCm: 2.3 },
];

export const TECH_STACK = [
  'PyTorch', 'OpenCV', 'Docker', 'CloudCompare',
  'NVIDIA CUDA', 'Open3D', 'FFmpeg', 'three.js', 'FastAPI',
];

export const RESEARCH_MODELS = [
  'Depth Anything V2', 'DROID-SLAM', 'MASt3R', 'MonST3R',
  '3D Gaussian Splatting', 'GTSAM/iSAM2', 'LaMa + Diffusion', 'SAM2',
];

export const MISSIONS = [
  {
    id: 'MSN-001',
    siteName: 'Wayanad Landslide Survey',
    date: '2026-08-12',
    droneModel: 'DJI Mavic 3 Enterprise',
    frameCount: 8160,
    rmseCm: 2.3,
    processingTimeMin: 17.4,
    status: 'completed',
    trustBreakdown: { observed: 72, inferred: 21, aiCompleted: 7 },
  },
  {
    id: 'MSN-002',
    siteName: 'Pamban Bridge Inspection',
    date: '2026-08-18',
    droneModel: 'DJI Matrice 350 RTK',
    frameCount: 6420,
    rmseCm: 1.8,
    processingTimeMin: 14.1,
    status: 'completed',
    trustBreakdown: { observed: 81, inferred: 15, aiCompleted: 4 },
  },
  {
    id: 'MSN-003',
    siteName: 'Assam Flood-Zone Mapping',
    date: '2026-07-29',
    droneModel: 'DJI Mavic 3 Enterprise',
    frameCount: 9540,
    rmseCm: 3.1,
    processingTimeMin: 19.8,
    status: 'completed',
    trustBreakdown: { observed: 64, inferred: 26, aiCompleted: 10 },
  },
  {
    id: 'MSN-004',
    siteName: 'Noida Construction Site',
    date: '2026-08-22',
    droneModel: 'DJI Matrice 350 RTK',
    frameCount: 5280,
    rmseCm: 1.5,
    processingTimeMin: 12.3,
    status: 'completed',
    trustBreakdown: { observed: 88, inferred: 10, aiCompleted: 2 },
  },
  {
    id: 'MSN-005',
    siteName: 'Rajasthan Powerline Corridor',
    date: '2026-08-05',
    droneModel: 'DJI Mavic 3 Enterprise',
    frameCount: 7320,
    rmseCm: 2.7,
    processingTimeMin: 16.2,
    status: 'completed',
    trustBreakdown: { observed: 69, inferred: 23, aiCompleted: 8 },
  },
  {
    id: 'MSN-006',
    siteName: 'Chennai Coastal Erosion Site',
    date: '2026-07-15',
    droneModel: 'DJI Matrice 350 RTK',
    frameCount: 8820,
    rmseCm: 2.9,
    processingTimeMin: 18.6,
    status: 'completed',
    trustBreakdown: { observed: 66, inferred: 24, aiCompleted: 10 },
  },
  {
    id: 'MSN-007',
    siteName: 'Uttarakhand Highway Collapse',
    date: '2026-09-01',
    droneModel: 'DJI Mavic 3 Enterprise',
    frameCount: 7680,
    rmseCm: 2.1,
    processingTimeMin: 15.9,
    status: 'processing',
    trustBreakdown: { observed: 74, inferred: 19, aiCompleted: 7 },
  },
  {
    id: 'MSN-008',
    siteName: 'Goa Heritage Structure Scan',
    date: '2026-08-28',
    droneModel: 'DJI Matrice 350 RTK',
    frameCount: 4560,
    rmseCm: 1.2,
    processingTimeMin: 11.7,
    status: 'completed',
    trustBreakdown: { observed: 91, inferred: 7, aiCompleted: 2 },
  },
];

export const DASHBOARD_STATS = {
  totalMissions: 47,
  modelsGenerated: 42,
  avgProcessingTimeMin: 17.3,
  avgAccuracyRmseCm: 2.3,
};

export const OUTPUT_FORMATS = [
  'Point Cloud (LAS/LAZ)',
  'Textured Mesh (glTF/OBJ)',
  '3D Gaussian Splat (glTF)',
  'Orthophoto (GeoTIFF)',
  'DSM (GeoTIFF)',
  'Inspection PDF',
];

export const NAV_ITEMS = [
  { path: '#/', label: 'Home', icon: 'home', breadcrumb: 'Home' },
  { path: '#/dashboard', label: 'Dashboard', icon: 'layout-dashboard', breadcrumb: 'Mission Dashboard' },
  { path: '#/upload', label: 'New Mission', icon: 'upload-cloud', breadcrumb: 'Mission Upload' },
  { path: '#/pipeline', label: 'Processing', icon: 'cpu', breadcrumb: 'Pipeline Visualizer' },
  { path: '#/viewer', label: '3D Viewer', icon: 'box', breadcrumb: '3D Model Viewer' },
];
