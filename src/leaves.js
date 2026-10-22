// Now and then a leaf or two drifts down across the stand, as if shaken
// loose from the unseen tree whose shadow falls on the wall: dry bamboo
// leaves, long and narrow, fluttering as they fall, casting small shadows on
// the papers. They come at random, every few seconds to a quarter minute,
// and never for people who prefer reduced motion.

import * as THREE from 'three';

const still = matchMedia('(prefers-reduced-motion: reduce)');
const LEN = 0.11, WID = 0.022; // a bamboo leaf, in metres
const MAX = 4;                 // never more than this in the air

// one leaf texture: colour with a midrib, and a lanceolate outline as alpha
function paintLeaf() {
  const W = 256, H = 64;
  const colour = document.createElement('canvas'), mask = document.createElement('canvas');
  colour.width = mask.width = W; colour.height = mask.height = H;
  const outline = new Path2D(`M2 ${H / 2}C${W * 0.25} 4 ${W * 0.7} 6 ${W - 2} ${H / 2}C${W * 0.7} ${H - 6} ${W * 0.25} ${H - 4} 2 ${H / 2}Z`);
  const m = mask.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  m.fillStyle = '#fff'; m.fill(outline);
  const g = colour.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#8a7a3c'); grad.addColorStop(0.5, '#a39a52'); grad.addColorStop(1, '#b9a35e');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(70, 60, 25, 0.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(4, H / 2); g.lineTo(W - 6, H / 2); g.stroke(); // midrib
  g.strokeStyle = 'rgba(70, 60, 25, 0.18)'; g.lineWidth = 1;
  for (const dy of [-10, -5, 5, 10]) { g.beginPath(); g.moveTo(20, H / 2 + dy); g.lineTo(W - 30, H / 2 + dy * 0.6); g.stroke(); }
  g.fillStyle = 'rgba(90, 60, 20, 0.25)'; // a few dry spots
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(40 + i * 33, H / 2 + ((i * 13) % 17) - 8, 3 + (i % 3), 0, 7); g.fill(); }
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: tex(colour, true), alphaMap: tex(mask, false) };
}

// a leaf bent a little along its length and curled across it
function leafGeometry() {
  const geo = new THREE.PlaneGeometry(LEN, WID, 12, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (LEN / 2), y = pos.getY(i) / (WID / 2);
    pos.setZ(i, 0.012 * x * x + 0.003 * y * y);
  }
  geo.computeVertexNormals();
  return geo;
}

export class FallingLeaves {
  constructor(scene, bounds) {
    this.scene = scene;
    this.bounds = bounds;
    this.leaves = [];
    this.wait = 2 + Math.random() * 4; // the first one comes soon
    const { map, alphaMap } = paintLeaf();
    this.material = new THREE.MeshStandardMaterial({ map, alphaMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    this.geometry = leafGeometry();
  }

  spawn(delay = 0) {
    const b = this.bounds, r = Math.random;
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.scale.setScalar(0.85 + r() * 0.45);
    mesh.visible = false;
    this.scene.add(mesh);
    this.leaves.push({
      mesh, delay,
      // start above the stand, a little in front of its face
      pos: new THREE.Vector3(
        THREE.MathUtils.lerp(b.min.x - 0.2, b.max.x + 0.3, r()),
        b.max.y + 0.35 + r() * 0.3,
        b.max.z + 0.04 + r() * 0.22,
      ),
      fall: 0.16 + r() * 0.1,           // m/s down
      drift: -0.06 + r() * 0.1,         // a light breeze, mostly leftward
      sway: 0.05 + r() * 0.06,          // side-to-side flutter, metres
      rate: 1.3 + r() * 1.1,            // flutter speed
      phase: r() * Math.PI * 2,
      spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(3),
      t: 0,
    });
  }

  update(dt) {
    if (still.matches) return;
    this.wait -= dt;
    if (this.wait <= 0) {
      if (this.leaves.length < MAX) {
        this.spawn();
        if (Math.random() < 0.35) this.spawn(0.6 + Math.random() * 1.2); // sometimes a pair
      }
      this.wait = 5 + Math.random() * 14;
    }
    for (const l of this.leaves) {
      if (l.delay > 0) { l.delay -= dt; continue; }
      l.mesh.visible = true;
      l.t += dt;
      const w = l.t * l.rate + l.phase;
      // falls in a swinging glide: slower and tipped at the ends of each swing
      l.pos.y -= l.fall * dt * (0.75 + 0.5 * Math.abs(Math.cos(w)));
      l.pos.x += l.drift * dt;
      l.mesh.position.set(l.pos.x + Math.sin(w) * l.sway, l.pos.y, l.pos.z + Math.cos(w * 0.7) * l.sway * 0.4);
      l.mesh.rotation.set(
        0.6 * Math.sin(w) + l.spin.x * l.t * 0.3,
        l.spin.y * l.t,
        0.5 * Math.cos(w) + l.spin.z * l.t * 0.2,
      );
    }
    // gone below the stand: tidy away
    this.leaves = this.leaves.filter((l) => {
      if (l.pos.y > this.bounds.min.y - 0.1) return true;
      this.scene.remove(l.mesh);
      return false;
    });
  }
}
