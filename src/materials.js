// Finishes for a quiet Japanese interior, painted from procedural noise so
// the placeholder reads as real material without image files: pale hinoki,
// smoked oak, blackened steel pins, frosted sleeves, plaster and stone.

import * as THREE from 'three';

let anisotropy = 4;
export function setMaterialAnisotropy(n) { anisotropy = n; }

// small seeded random, so the wear pattern is the same on every load
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Value noise: random grids of several sizes, scaled up smoothly and stacked.
function noise(size, seed, octaves = [[4, 0.45], [16, 0.3], [64, 0.17], [256, 0.08]]) {
  const rand = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  for (const [cells, weight] of octaves) {
    const g = document.createElement('canvas');
    g.width = g.height = cells;
    const gx = g.getContext('2d');
    const img = gx.createImageData(cells, cells);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    ctx.globalAlpha = weight;
    ctx.drawImage(g, 0, 0, size, size);
  }
  ctx.globalAlpha = 1;
  return c;
}

function texture(canvas, { srgb = false, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = anisotropy;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// colour map: base colour, mottled by noise, with chips and scuffs
function wornColour(base, seed, { chips = 0, chipColour = '#3a3530', mottle = 0.12, size = 512 } = {}) {
  const n = noise(size, seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = mottle * 4;
  ctx.drawImage(n, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  const rand = rng(seed + 7);
  for (let i = 0; i < chips; i++) {
    const x = rand() * size, y = rand() * size, r = 1 + rand() * rand() * 7;
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.fillStyle = chipColour;
    ctx.beginPath(); ctx.ellipse(x, y, r * (1 + rand()), r, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

// grey map squeezed into [lo, hi], used for roughness and bump
function range(canvas, lo, hi) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = lo * 255 + (img.data[i] / 255) * (hi - lo) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Wood grain with the fibres running along v (down the length of a beam).
// UVs are scaled to real size in stands.js, so one tile is 25 × 100 cm.
function woodGrain(base, dark, seed, ringPx = 26) {
  const W = 512, H = 1024, rand = rng(seed);
  const a = new THREE.Color(base), b = new THREE.Color(dark);
  // long fibre streaks: smoothed random value per column
  const streak = new Float32Array(W);
  let v = rand();
  for (let x = 0; x < W; x++) { v += (rand() - 0.5) * 0.35; v = Math.min(1, Math.max(0, v)); streak[x] = v; }
  const p1 = rand() * 6, p2 = rand() * 6;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const warp = 16 * Math.sin(y * 0.005 + p1) + 7 * Math.sin(y * 0.017 + x * 0.011 + p2);
      const t = (x + warp) / ringPx;
      const ring = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2), 8);
      const k = Math.min(1, ring * 0.5 + streak[x] * 0.22 + (rand() - 0.5) * 0.05);
      const i = (y * W + x) * 4;
      img.data[i] = (a.r + (b.r - a.r) * k) * 255;
      img.data[i + 1] = (a.g + (b.g - a.g) * k) * 255;
      img.data[i + 2] = (a.b + (b.b - a.b) * k) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grey(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(canvas, 0, 0);
  return c;
}

function wood(base, dark, seed, { roughness = [0.45, 0.75], ring } = {}) {
  const grain = woodGrain(base, dark, seed, ring);
  return new THREE.MeshPhysicalMaterial({
    map: texture(grain, { srgb: true }),
    roughness: 1,
    roughnessMap: texture(range(grey(grain), roughness[0], roughness[1])),
    bumpMap: texture(grey(grain)),
    bumpScale: 0.35,
    sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color('#fff4e2'), // oiled finish
  });
}

export function makeMaterials() {
  const fine = noise(256, 23, [[32, 0.5], [128, 0.3], [256, 0.2]]);

  return {
    // pale hinoki for uprights, ledges and rungs
    hinoki: wood('#f0e3cb', '#d3b78e', 31),
    // smoked oak for back boards and bases, for quiet contrast
    oak: wood('#a88a6c', '#76583f', 37, { roughness: [0.4, 0.7], ring: 34 }),
    // blackened steel pins and bolt heads
    iron: new THREE.MeshStandardMaterial({ color: '#2a2826', metalness: 0.8, roughness: 0.45 }),
    // frosted acrylic sleeves on the rung ends, as in the photo. Kept opaque:
    // see-through parts inside one merged mesh can't be depth-sorted and flicker.
    sleeve: new THREE.MeshPhysicalMaterial({ color: '#efebe4', roughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    floor: new THREE.MeshStandardMaterial({
      map: texture(wornColour('#e4ddd1', 17, { mottle: 0.1, size: 1024 }), { srgb: true, repeat: [3, 3] }),
      roughness: 1,
      roughnessMap: texture(range(noise(512, 19), 0.6, 0.9), { repeat: [3, 3] }),
      bumpMap: texture(fine, { repeat: [12, 12] }), bumpScale: 0.3,
    }),
    wall: new THREE.MeshStandardMaterial({
      map: texture(wornColour('#efe9de', 29, { mottle: 0.06, size: 1024 }), { srgb: true, repeat: [2, 1] }),
      roughness: 0.95,
      bumpMap: texture(fine, { repeat: [10, 5] }), bumpScale: 0.35,
    }),
  };
}
