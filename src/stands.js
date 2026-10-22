// Placeholder stands, styled as mid-century newsstand fixtures: bent steel
// tube in green enamel, chrome wire shelves and rungs, brass ball ends,
// rubber feet and enamel signs. They expose the same slots a GLB would
// (see models/README.md), so swapping in the real model is a config change.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NEWS } from './items.js';
import { makeMaterials } from './materials.js';
import { paintEnamelSign } from './textures.js';

const deg = THREE.MathUtils.degToRad;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// Collects geometry per material and merges it, so hundreds of wires and
// tubes draw as a handful of meshes.
class Kit {
  constructor(mats) { this.mats = mats; this.parts = new Map(); }

  add(geo, mat) {
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geo);
  }

  // straight rod between two points
  rod(a, b, r, mat) {
    const dir = b.clone().sub(a);
    const g = new THREE.CylinderGeometry(r, r, dir.length(), 14, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    this.add(g, mat);
  }

  // tube through points with rounded corners, like bent steel
  bent(points, r, bend, mat) {
    const path = new THREE.CurvePath();
    let prev = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1];
      const ab = b.clone().sub(a), bc = c.clone().sub(b);
      const p1 = b.clone().sub(ab.normalize().multiplyScalar(Math.min(bend, a.distanceTo(b) / 2)));
      const p2 = b.clone().add(bc.normalize().multiplyScalar(Math.min(bend, b.distanceTo(c) / 2)));
      path.add(new THREE.LineCurve3(prev, p1));
      path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
      prev = p2;
    }
    path.add(new THREE.LineCurve3(prev, points.at(-1).clone()));
    this.add(new THREE.TubeGeometry(path, points.length * 40, r, 14, false), mat);
  }

  ball(p, r, mat) {
    const g = new THREE.SphereGeometry(r, 16, 12);
    g.translate(p.x, p.y, p.z);
    this.add(g, mat);
  }

  foot(p, mat) {
    const g = new THREE.CylinderGeometry(0.016, 0.019, 0.022, 16);
    g.translate(p.x, p.y + 0.011, p.z);
    this.add(g, mat);
  }

  build(name) {
    const g = new THREE.Group();
    g.name = name;
    for (const [mat, geos] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(geos.map((x) => x.toNonIndexed())), mat);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
}

function sign(text, w, mats) {
  const t = new THREE.CanvasTexture(paintEnamelSign(text));
  t.colorSpace = THREE.SRGBColorSpace;
  const face = mats.enamelSheet.clone();
  face.map = t;
  const h = w * 224 / 1024;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), [mats.enamel, mats.enamel, mats.enamel, mats.enamel, face, mats.enamel]);
  m.castShadow = true;
  return m;
}

function slot(name, parent, x, y, z, rx = 0, rz = 0) {
  const s = new THREE.Object3D();
  s.name = name;
  s.position.set(x, y, z);
  s.rotation.set(rx, 0, rz);
  parent.add(s);
  return s;
}

// Wire magazine rack: one bent frame, three wire shelves with chrome lips,
// a wire back and an enamel sign on top.
function magazineRack(mats) {
  const k = new Kit(mats);
  const X = 0.33, back = -0.13, top = 1.66, r = 0.012;

  // the frame is one tube: front foot, back, up, across the top, down, front foot
  k.bent([V(-X, 0.03, 0.17), V(-X, 0.03, back), V(-X, top, back), V(X, top, back), V(X, 0.03, back), V(X, 0.03, 0.17)], r, 0.07, mats.enamel);
  k.rod(V(-X, 0.03, back), V(-X, 0.03, back - 0.12), r, mats.enamel);
  k.rod(V(X, 0.03, back), V(X, 0.03, back - 0.12), r, mats.enamel);
  for (const p of [V(-X, 0.008, 0.17), V(X, 0.008, 0.17), V(-X, 0.008, back - 0.12), V(X, 0.008, back - 0.12)]) k.foot(p, mats.rubber);

  // wire back
  for (let x = -X + 0.05; x < X - 0.02; x += 0.055) k.rod(V(x, 0.12, back + 0.004), V(x, top - 0.06, back + 0.004), 0.0025, mats.chrome);
  for (const y of [0.12, 0.5, 0.95, 1.4, top - 0.06]) k.rod(V(-X, y, back + 0.008), V(X, y, back + 0.008), 0.003, mats.chrome);

  for (const y of [1.2, 0.76, 0.32]) {
    // shelf: front and back bars, wires front to back, angled brackets to the frame
    k.rod(V(-X, y - 0.012, 0.008), V(X, y - 0.012, 0.008), 0.007, mats.enamel);
    k.rod(V(-X, y - 0.012, back), V(X, y - 0.012, back), 0.007, mats.enamel);
    for (let x = -X + 0.03; x < X - 0.01; x += 0.032) k.rod(V(x, y - 0.004, back), V(x, y - 0.004, 0.008), 0.0025, mats.chrome);
    for (const s of [-1, 1]) k.rod(V(s * X, y - 0.012, 0.008), V(s * X, y - 0.17, back), 0.006, mats.enamel);
    // chrome lip in front of the covers, on little posts
    k.rod(V(-X, y + 0.035, 0.012), V(X, y + 0.035, 0.012), 0.0045, mats.chrome);
    for (let x = -X + 0.04; x < X; x += 0.155) k.rod(V(x, y - 0.012, 0.01), V(x, y + 0.035, 0.012), 0.0025, mats.chrome);
    for (const s of [-1, 1]) k.ball(V(s * (X + 0.012), y + 0.035, 0.012), 0.009, mats.brass);
  }

  const g = k.build('magazine_rack');
  let n = 0;
  for (const y of [1.2, 0.76, 0.32]) for (const x of [-0.155, 0.155]) slot(`slot_magazine_${String(++n).padStart(2, '0')}`, g, x, y, -0.03, deg(-12));

  const s = sign('Magazines', 0.56, mats);
  s.position.set(0, top + 0.1, back + 0.004);
  g.add(s);
  const kk = new Kit(mats);
  for (const x of [-0.2, 0.2]) kk.rod(V(x, top, back + 0.004), V(x, top + 0.04, back + 0.004), 0.004, mats.chrome);
  g.add(kk.build('sign_posts'));
  return g;
}

// Ladder stand after the reference photo, in metal: two bent uprights that
// lean back slightly and meet in an arch, chrome rungs with brass ends, each
// paper draped over a rung, turned on its side, overlapping the one above.
export const LADDER = { rungs: 6, top: 1.52, step: 0.135 };

function newspaperLadder(mats) {
  const k = new Kit(mats);
  const LW = 0.38, X = LW / 2 + 0.0175, r = 0.012, topY = 1.7;
  // rungs step forward as they go down; the uprights follow the same lean
  const rungZ = (y) => 0.05 + 0.008 * (LADDER.top - y) / LADDER.step;
  const postZ = (y) => rungZ(y) - 0.018;

  k.bent([V(-X, 0.03, 0.3), V(-X, 0.03, postZ(0.03)), V(-X, topY, postZ(topY)), V(X, topY, postZ(topY)), V(X, 0.03, postZ(0.03)), V(X, 0.03, 0.3)], r, 0.06, mats.enamel);
  for (const s of [-1, 1]) {
    k.rod(V(s * X, 0.03, postZ(0.03)), V(s * X, 0.03, -0.16), r, mats.enamel);
    k.foot(V(s * X, 0.008, 0.3), mats.rubber);
    k.foot(V(s * X, 0.008, -0.16), mats.rubber);
  }
  // cross brace low down, and a wire panel behind the lower papers
  k.rod(V(-X, 0.22, postZ(0.22)), V(X, 0.22, postZ(0.22)), 0.008, mats.enamel);
  for (let x = -X + 0.04; x < X - 0.02; x += 0.045) k.rod(V(x, 0.22, postZ(0.22) - 0.02), V(x, 0.95, postZ(0.95) - 0.02), 0.0025, mats.chrome);
  for (const y of [0.22, 0.58, 0.95]) k.rod(V(-X, y, postZ(y) - 0.016), V(X, y, postZ(y) - 0.016), 0.003, mats.chrome);

  const hangW = NEWS.H, hangH = NEWS.W; // the folded paper, turned on its side
  const g0 = [];
  for (let i = 0; i < LADDER.rungs; i++) {
    const y = LADDER.top - i * LADDER.step;
    const z = rungZ(y);
    k.rod(V(-X - 0.02, y, z), V(X + 0.02, y, z), 0.006, mats.chrome);
    for (const s of [-1, 1]) {
      k.ball(V(s * (X + 0.026), y, z), 0.01, mats.brass);
      k.rod(V(s * X, y, z), V(s * X, y, postZ(y)), 0.007, mats.chrome); // collar to the upright
    }
    g0.push([-hangW / 2, y - 0.008 - hangH / 2, z - 0.004]);
  }

  const g = k.build('newspaper_ladder');
  // slot at the paper's left edge, half way down; +Y turned to point right
  g0.forEach(([x, y, z], i) => slot(`slot_newspaper_${String(i + 1).padStart(2, '0')}`, g, x, y, z, deg(-2.7), deg(-90)));

  const s = sign('Daily News', 0.46, mats);
  s.position.set(0, topY + 0.09, postZ(topY));
  g.add(s);
  const kk = new Kit(mats);
  for (const x of [-0.16, 0.16]) kk.rod(V(x, topY, postZ(topY)), V(x, topY + 0.04, postZ(topY)), 0.004, mats.chrome);
  g.add(kk.build('sign_posts'));
  return g;
}

// Builds the room and both stands. Returns the slots, found by name the same
// way loadModel() does for a GLB, and the group the camera should frame.
export function buildPlaceholder(scene) {
  const mats = makeMaterials();
  const room = new THREE.Group();
  room.name = 'placeholder';

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mats.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), mats.wall);
  wall.position.set(0, 2.5, -0.5); wall.receiveShadow = true;
  room.add(floor, wall);

  const rack = magazineRack(mats);
  rack.position.set(-0.52, 0, 0);
  const ladder = newspaperLadder(mats);
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
