// Vintage metal finishes, painted from procedural noise so the placeholder
// reads as real material without any image files: chipped enamel, worn
// chrome, aged brass, concrete and plaster.

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

export function makeMaterials() {
  const grain = noise(512, 11);
  const fine = noise(256, 23, [[32, 0.5], [128, 0.3], [256, 0.2]]);

  // painted steel tube: deep green enamel, gloss worn in places, small chips to bare metal
  const enamel = new THREE.MeshPhysicalMaterial({
    map: texture(wornColour('#2d4a3e', 3, { chips: 160, chipColour: '#5b5650' }), { srgb: true, repeat: [1, 6] }),
    roughness: 1,
    roughnessMap: texture(range(grain, 0.25, 0.6), { repeat: [1, 6] }),
    metalness: 0.15,
    clearcoat: 0.6,
    clearcoatRoughness: 0.28,
    bumpMap: texture(fine, { repeat: [1, 6] }),
    bumpScale: 0.6,
  });

  // the same enamel on flat sheet (signs), without the tube's stretched UVs
  const enamelSheet = enamel.clone();
  enamelSheet.map = texture(wornColour('#2d4a3e', 5, { chips: 40, chipColour: '#5b5650' }), { srgb: true });

  const chrome = new THREE.MeshStandardMaterial({
    color: '#d4d6d6',
    metalness: 1,
    roughness: 1,
    roughnessMap: texture(range(grain, 0.08, 0.32), { repeat: [1, 4] }),
    bumpMap: texture(fine, { repeat: [1, 4] }),
    bumpScale: 0.15,
  });

  const brass = new THREE.MeshStandardMaterial({
    map: texture(wornColour('#b38a4e', 9, { chips: 60, chipColour: '#5d4a2a', mottle: 0.2 }), { srgb: true }),
    metalness: 1,
    roughness: 1,
    roughnessMap: texture(range(grain, 0.25, 0.55)),
  });

  const rubber = new THREE.MeshStandardMaterial({ color: '#1c1b1a', roughness: 0.85 });

  const castIron = new THREE.MeshStandardMaterial({
    map: texture(wornColour('#2b2a28', 13, { chips: 80, chipColour: '#4a3a2c', mottle: 0.25 }), { srgb: true }),
    metalness: 0.7,
    roughness: 1,
    roughnessMap: texture(range(grain, 0.45, 0.8)),
    bumpMap: texture(fine), bumpScale: 1,
  });

  const floor = new THREE.MeshStandardMaterial({
    map: texture(wornColour('#d8d3c9', 17, { mottle: 0.18, size: 1024 }), { srgb: true, repeat: [3, 3] }),
    roughness: 1,
    roughnessMap: texture(range(noise(512, 19), 0.65, 0.95), { repeat: [3, 3] }),
    bumpMap: texture(fine, { repeat: [12, 12] }), bumpScale: 0.4,
  });

  const wall = new THREE.MeshStandardMaterial({
    map: texture(wornColour('#f3f0ea', 29, { mottle: 0.05, size: 1024 }), { srgb: true, repeat: [2, 1] }),
    roughness: 0.95,
    bumpMap: texture(fine, { repeat: [10, 5] }), bumpScale: 0.25,
  });

  return { enamel, enamelSheet, chrome, brass, rubber, castIron, floor, wall };
}
