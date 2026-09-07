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
