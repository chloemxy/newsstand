// Grey-box stands used until the real model arrives. They expose the same
// slots a GLB would (see models/README.md), so swapping is a config change.

import * as THREE from 'three';
import { NEWS } from './items.js';
import { paintSign, NEWSPRINT } from './textures.js';

const deg = THREE.MathUtils.degToRad;

const mat = {
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.7 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#5b3b27', roughness: 0.75 }),
  metal: new THREE.MeshStandardMaterial({ color: '#2f3336', roughness: 0.4, metalness: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ color: '#5a4a3d', roughness: 1 }),
  floor: new THREE.MeshStandardMaterial({ color: '#6f665b', roughness: 0.9 }),
  stack: new THREE.MeshStandardMaterial({ color: NEWSPRINT, roughness: 0.95 }),
};

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function sign(text, w) {
  const t = new THREE.CanvasTexture(paintSign(text));
  t.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, w * 160 / 1024, 0.02), [mat.metal, mat.metal, mat.metal, mat.metal, front, mat.metal]);
  m.castShadow = true;
  return m;
}

function slot(name, parent, x, y, z, rx = 0) {
  const s = new THREE.Object3D();
  s.name = name;
  s.position.set(x, y, z);
  s.rotation.x = rx;
  parent.add(s);
  return s;
}

function magazineRack() {
  const g = new THREE.Group();
  const RW = 0.62, RH = 1.75;
  g.add(box(0.03, RH, 0.3, mat.metal, -RW / 2 - 0.015, RH / 2, -0.02));
  g.add(box(0.03, RH, 0.3, mat.metal, RW / 2 + 0.015, RH / 2, -0.02));
  g.add(box(RW, RH, 0.02, mat.woodDark, 0, RH / 2, -0.1));
  g.add(box(RW + 0.06, 0.1, 0.32, mat.metal, 0, 0.05, -0.02));
  const header = sign('Magazines', RW + 0.06);
  header.position.set(0, RH + 0.06, -0.02);
  g.add(header);

  let n = 0;
  for (const y of [1.25, 0.8, 0.35]) {
    g.add(box(RW, 0.02, 0.12, mat.wood, 0, y - 0.01, -0.04));
    g.add(box(RW, 0.05, 0.012, mat.wood, 0, y + 0.015, 0.016));
    for (const x of [-0.155, 0.155]) slot(`slot_magazine_${String(++n).padStart(2, '0')}`, g, x, y, -0.03, deg(-12));
  }
  return g;
}

function newspaperStand() {
  const g = new THREE.Group();
  const NW = 3 * NEWS.W + 4 * 0.04;
  g.add(box(NW, 0.72, 0.46, mat.woodDark, 0, 0.36, 0));
  const deck = new THREE.Group();
  deck.position.set(0, 0.8, 0);
  deck.rotation.x = deg(20);
  deck.add(box(NW, 0.02, 0.5, mat.wood, 0, 0, 0));
  deck.add(box(NW, 0.03, 0.015, mat.wood, 0, 0.025, 0.245));
  g.add(deck);

  const stackH = 0.03;
  [-1, 0, 1].forEach((i, k) => {
    const x = i * (NEWS.W + 0.04);
    deck.add(box(NEWS.W, stackH, NEWS.H, mat.stack, x, 0.01 + stackH / 2, 0.235 - NEWS.H / 2));
    slot(`slot_newspaper_${String(k + 1).padStart(2, '0')}`, deck, x, 0.01 + stackH, 0.235, deg(-90));
  });

  for (const x of [-NW / 2 + 0.02, NW / 2 - 0.02]) g.add(box(0.02, 0.5, 0.02, mat.metal, x, 1.15, -0.2));
  const header = sign('Newspapers', NW * 0.6);
  header.position.set(0, 1.4, -0.2);
  g.add(header);
  return g;
}

// Builds the room and both stands. Returns slots found by name, the same
// way loadModel() does for a GLB.
export function buildPlaceholder(scene) {
  const room = new THREE.Group();
  room.name = 'placeholder';

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat.wall);
  wall.position.set(0, 2, -0.42); wall.receiveShadow = true;
  room.add(floor, wall);

  const rack = magazineRack();
  rack.position.set(-0.85, 0, 0);
  const stand = newspaperStand();
  stand.position.set(0.45, 0, 0.05);
  room.add(rack, stand);
  scene.add(room);
  return collectSlots(room);
}

export function collectSlots(root) {
  const slots = { magazines: [], newspapers: [] };
  root.traverse((o) => {
    const n = o.name.toLowerCase();
    if (n.startsWith('slot_magazine')) slots.magazines.push(o);
    else if (n.startsWith('slot_newspaper')) slots.newspapers.push(o);
  });
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
  slots.magazines.sort(byName);
  slots.newspapers.sort(byName);
  return slots;
}
