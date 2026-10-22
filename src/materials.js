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

// Scanned CC0 maps (see assets/tex/CREDITS.md), loaded once before the
// scene is built so nothing pops in.
const SCANS = {
  ashDiff: 'assets/tex/ash_diff.jpg', ashRough: 'assets/tex/ash_rough.jpg', ashNor: 'assets/tex/ash_nor.jpg',
  mdfDiff: 'assets/tex/mdf_diff.jpg', mdfRough: 'assets/tex/mdf_rough.jpg', mdfNor: 'assets/tex/mdf_nor.jpg',
};
const scans = {};

export async function loadScans() {
  const loader = new THREE.TextureLoader();
  await Promise.all(Object.entries(SCANS).map(async ([k, url]) => {
    const t = await loader.loadAsync(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    if (k.endsWith('Diff')) t.colorSpace = THREE.SRGBColorSpace;
    scans[k] = t;
  }));
}

// A scanned material. `turn` rotates the maps a quarter turn so the grain
// runs along v, down the length of a beam (stands.js scales UVs to metres).
function scanned(prefix, { tint = '#ffffff', turn = false, normal = 0.6, rough = 1 } = {}) {
  const maps = ['Diff', 'Rough', 'Nor'].map((m) => {
    const t = scans[prefix + m].clone();
    if (turn) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
    t.needsUpdate = true;
    return t;
  });
  return new THREE.MeshStandardMaterial({
    color: tint, vertexColors: true, // each piece carries its own tone (stands.js)
    map: maps[0], roughness: rough, roughnessMap: maps[1],
    normalMap: maps[2], normalScale: new THREE.Vector2(normal, normal),
  });
}

export function makeMaterials() {
  const fine = noise(256, 23, [[32, 0.5], [128, 0.3], [256, 0.2]]);

  return {
    // pine posts, blocks and rods: scanned ash veneer, warmed to pine
    // (key kept as `hinoki`)
    hinoki: scanned('ash', { tint: '#fff1de', turn: true, normal: 0.5 }),
    // MDF board and base: a scanned smooth kraft board, darkened to MDF brown
    oak: scanned('mdf', { tint: '#9d9289', normal: 0.35 }), // desaturated toward real MDF
    // brushed steel for the newspaper rods: fine lengthwise streaks
    steel: new THREE.MeshStandardMaterial({
      color: '#bdb6a9', metalness: 1, roughness: 1, // gently tarnished
      roughnessMap: texture(range(noise(256, 53, [[4, 0.3], [256, 0.7]]), 0.3, 0.55), { repeat: [1, 8] }),
    }),
    // dark zinc screws and washers
    iron: new THREE.MeshStandardMaterial({ color: '#4b4c4c', metalness: 0.85, roughness: 0.4 }),
    // black plastic sleeves on the rod ends. Opaque: see-through parts inside
    // one merged mesh can't be depth-sorted and flicker.
    sleeve: new THREE.MeshPhysicalMaterial({ color: '#1b1b1a', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
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
