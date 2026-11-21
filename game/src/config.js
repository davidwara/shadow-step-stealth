// Shadow Step — tuning constants + level roster.
// All procedural: no image or audio files, everything is drawn / sounded in code.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const W = COLS * TILE; // 1280
export const H = ROWS * TILE; // 720

export const CFG = {
  walkSpeed: 150, // px per second
  runSpeed: 250,
  crouchSpeed: 85,
  guardSpeed: 95,
  guardChaseSpeed: 185,
  viewDist: 230, // guard vision cone length
  viewHalfAngle: 0.61, // ~35 degrees each side
  detectRate: 62, // meter points per second at full visibility
  detectDecay: 26, // meter points per second while unseen
  alarmMax: 3,
  noiseWalk: 70,
  noiseRun: 150,
  noiseCrouch: 28,
  pebbleNoise: 230,
  pebbleRange: 320,
  catchDist: 26,
  keyPickupDist: 30,
  scrollPickupDist: 30,
  exitDist: 34,
};

export const LEVEL_NAMES = [
  'Museum Malam',
  'Kuil Hutan',
  'Gudang Pelabuhan',
  'Kantor Arsip',
  'Taman Istana',
  'Ruang Brankas',
];

export const LEVEL_SUBS = [
  'Ambil naskah kuno, jangan sampai terlihat.',
  'Patroli di antara reruntuhan dan semak.',
  'Peti-peti menumpuk, penjaga berputar.',
  'Arsip rahasia di balik meja dan rak.',
  'Taman terbuka — semak adalah temanmu.',
  'Brankas terakhir. Penjaga paling banyak.',
];
