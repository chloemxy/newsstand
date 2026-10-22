// Grey-box stands used until the real model arrives. They expose the same
// slots a GLB would (see models/README.md), so swapping is a config change.
// Materials follow the reference stand: raw pine, MDF, clear sleeves.

import * as THREE from 'three';
import { NEWS } from './items.js';

const deg = THREE.MathUtils.degToRad;

const mat = {
  pine: new THREE.MeshStandardMaterial({ color: '#ecd7b4', roughness: 0.75 }),
  mdf: new THREE.MeshStandardMaterial({ color: '#c9a581', roughness: 0.9 }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#f2eef2', roughness: 0.2, transparent: true, opacity: 0.55 }),
  bolt: new THREE.MeshStandardMaterial({ color: '#55585a', roughness: 0.4, metalness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }),
  floor: new THREE.MeshStandardMaterial({ color: '#efefed', roughness: 0.95 }),
};

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function rod(len, r, m, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), m);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function slot(name, parent, x, y, z, rx = 0, rz = 0) {
  const s = new THREE.Object3D();
  s.name = name;
  s.position.set(x, y, z);
  s.rotation.set(rx, 0, rz);
  parent.add(s);
  return s;
}

// Shelved rack: pine frame, MDF back, three ledges of two magazines.
function magazineRack() {
  const g = new THREE.Group();
  const RW = 0.62, RH = 1.6;
  g.add(box(0.035, RH, 0.035, mat.pine, -RW / 2 - 0.018, RH / 2, 0.0));
  g.add(box(0.035, RH, 0.035, mat.pine, RW / 2 + 0.018, RH / 2, 0.0));
  g.add(box(RW, 1.45, 0.018, mat.mdf, 0, 0.1 + 1.45 / 2, -0.1));
  g.add(box(RW + 0.12, 0.03, 0.26, mat.mdf, 0, 0.015, -0.03));

  let n = 0;
  for (const y of [1.2, 0.76, 0.32]) {
    g.add(box(RW, 0.018, 0.12, mat.pine, 0, y - 0.009, -0.04));
    g.add(rod(RW + 0.04, 0.006, mat.pine, 0, y + 0.03, 0.012));
    for (const x of [-0.155, 0.155]) slot(`slot_magazine_${String(++n).padStart(2, '0')}`, g, x, y, -0.03, deg(-12));
  }
  return g;
}

// Ladder stand after the reference photo: two pine uprights, an MDF board on
// feet, and dowel rungs. Each paper drapes over a rung, turned on its side so
// the masthead runs down the right edge, and each lower paper overlaps the
// one above it.
export const LADDER = { rungs: 6, top: 1.52, step: 0.135 };

function newspaperLadder() {
  const g = new THREE.Group();
  const LW = 0.38, H = 1.75;
  const post = 0.035;
  g.add(box(post, H, post, mat.pine, -LW / 2 - post / 2, H / 2, 0.02));
  g.add(box(post, H, post, mat.pine, LW / 2 + post / 2, H / 2, 0.02));
  g.add(box(LW + 0.04, 0.95, 0.018, mat.mdf, 0, 0.03 + 0.95 / 2, -0.01));
  g.add(box(LW + 0.08, 0.03, 0.2, mat.mdf, 0, 0.015, 0.02));
  for (const x of [-LW / 2 - post / 2, LW / 2 + post / 2]) {
    for (const y of [0.32, 0.72]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12), mat.bolt);
      b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.04);
      g.add(b);
    }
  }

  const hangW = NEWS.H, hangH = NEWS.W; // the folded paper, turned on its side
  for (let i = 0; i < LADDER.rungs; i++) {
    const y = LADDER.top - i * LADDER.step;
    const z = 0.05 + i * 0.008;
    g.add(rod(LW + 0.1, 0.006, mat.pine, 0, y, z));
    for (const s of [-1, 1]) {
      g.add(rod(0.05, 0.0085, mat.sleeve, s * (LW / 2 - 0.02), y, z));
      g.add(box(0.032, 0.05, 0.03, mat.pine, s * (LW / 2 + post / 2), y - 0.04, z - 0.02));
    }
    // slot at the paper's left edge, half way down; +Y turned to point right
    slot(`slot_newspaper_${String(i + 1).padStart(2, '0')}`, g, -hangW / 2, y - 0.006 - hangH / 2, z - 0.004, deg(-3), deg(-90));
  }
  return g;
}

// Builds the room and both stands. Returns the slots, found by name the same
// way loadModel() does for a GLB, and the group the camera should frame.
export function buildPlaceholder(scene) {
  const room = new THREE.Group();
  room.name = 'placeholder';

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), mat.wall);
  wall.position.set(0, 2.5, -0.5); wall.receiveShadow = true;
  room.add(floor, wall);

  const rack = magazineRack();
  rack.position.set(-0.5, 0, 0);
  const ladder = newspaperLadder();
  ladder.position.set(0.42, 0, 0);
  const stands = new THREE.Group();
  stands.name = 'focus';
  stands.add(rack, ladder);
  room.add(stands);
  scene.add(room);
  return { slots: collectSlots(room), focus: stands };
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
