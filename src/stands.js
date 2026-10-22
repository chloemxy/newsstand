// Placeholder stands in wood, after the reference photo, with a quiet
// Japanese finish: pale hinoki uprights, ledges and dowels, a smoked oak
// back board on split base slabs, small spacer blocks under each dowel,
// frosted sleeves and blackened bolts. They expose the same slots a GLB
// would (see models/README.md), so swapping in the real model is a config
// change.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NEWS } from './items.js';
import { makeMaterials } from './materials.js';

const deg = THREE.MathUtils.degToRad;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TILE = { u: 0.25, v: 1 }; // metres covered by one tile of the grain texture

// Collects geometry per material and merges it, so every board, block and
// dowel of a stand draws as a handful of meshes. UVs are scaled to real
// size so the grain is the same density on a thin dowel and a wide board.
class Kit {
  constructor() { this.parts = new Map(); this.seed = 1; }

  add(geo, mat) {
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geo);
  }

  offset() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }

  // a squared timber from a to b; `across` sets which way its width runs
  beam(a, b, width, depth, mat, across = V(1, 0, 0)) {
    const L = b.clone().sub(a);
    const len = L.length();
    L.normalize();
    const W = across.clone().sub(L.clone().multiplyScalar(across.dot(L))).normalize();
    const D = W.clone().cross(L);
    const g = new THREE.BoxGeometry(width, len, depth);
    // faces: +x, -x, +y, -y, +z, -z, four vertices each
    const dims = [[depth, len], [depth, len], [width, depth], [width, depth], [width, len], [width, len]];
    const uv = g.attributes.uv, du = this.offset(), dv = this.offset();
    for (let f = 0; f < 6; f++) for (let i = f * 4; i < f * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * dims[f][0] / TILE.u + du, uv.getY(i) * dims[f][1] / TILE.v + dv);
    }
    g.applyMatrix4(new THREE.Matrix4().makeBasis(W, L, D).setPosition(a.clone().add(b).multiplyScalar(0.5)));
    this.add(g, mat);
  }

  // a round dowel from a to b
  dowel(a, b, r, mat, segments = 20) {
    const L = b.clone().sub(a), len = L.length();
    const g = new THREE.CylinderGeometry(r, r, len, segments, 1);
    const uv = g.attributes.uv, du = this.offset();
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (2 * Math.PI * r) / TILE.u + du, uv.getY(i) * len / TILE.v);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), L.normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    this.add(g, mat);
  }

  // a bolt head on a face, pointing along `normal`
  bolt(p, normal, mat) {
    const g = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 16);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), normal));
    g.translate(p.x, p.y, p.z);
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

function slot(name, parent, x, y, z, rx = 0, rz = 0) {
  const s = new THREE.Object3D();
  s.name = name;
  s.position.set(x, y, z);
  s.rotation.set(rx, 0, rz);
  parent.add(s);
  return s;
}

const POST = 0.035;
const HEIGHT = 1.75;    // both stands share a height
const BASE_AHEAD = 0.06; // base slabs sit this far in front of the back board

// split base slabs, as in the photo
function base(k, mats, halfW, z, depth) {
  k.beam(V(-halfW, 0.015, z), V(-0.003, 0.015, z), depth, 0.03, mats.oak, V(0, 0, 1));
  k.beam(V(0.003, 0.015, z), V(halfW, 0.015, z), depth, 0.03, mats.oak, V(0, 0, 1));
}

// Magazine shelf in the same language: hinoki posts in front of an oak
// board, three hinoki ledges, a dowel lip on spacer blocks for each tier.
function magazineRack(mats) {
  const k = new Kit();
  const RW = 0.62, X = RW / 2 + POST / 2, H = HEIGHT;
  const boardZ = -0.1, postZ = boardZ + 0.008 + POST / 2 + 0.001;

  base(k, mats, RW / 2 + 0.06, boardZ + BASE_AHEAD, 0.22);
  k.beam(V(0, 0.03, boardZ), V(0, 1.48, boardZ), RW + 0.04, 0.016, mats.oak);
  for (const s of [-1, 1]) {
    k.beam(V(s * X, 0.03, postZ), V(s * X, H, postZ), POST, POST, mats.hinoki);
    for (const y of [0.18, 0.62, 1.06]) k.bolt(V(s * X, y, postZ + POST / 2 + 0.002), V(0, 0, 1), mats.iron);
  }

  for (const y of [1.2, 0.76, 0.32]) {
    k.beam(V(-RW / 2, y - 0.009, -0.045), V(RW / 2, y - 0.009, -0.045), 0.11, 0.018, mats.hinoki, V(0, 0, 1));
    const lipY = y + 0.03, lipZ = 0.014;
    k.dowel(V(-X - 0.025, lipY, lipZ), V(X + 0.025, lipY, lipZ), 0.006, mats.hinoki);
    for (const s of [-1, 1]) {
      k.dowel(V(s * (RW / 2 - 0.045), lipY, lipZ), V(s * (RW / 2 - 0.005), lipY, lipZ), 0.0085, mats.sleeve);
      // spacer block from the post forward to the dowel
      const z0 = postZ - POST / 2, z1 = lipZ + 0.012;
      k.beam(V(s * X, lipY - 0.055, (z0 + z1) / 2), V(s * X, lipY - 0.007, (z0 + z1) / 2), POST + 0.004, z1 - z0, mats.hinoki);
    }
  }

  const g = k.build('magazine_rack');
  g.userData.boardZ = boardZ;
  let n = 0;
  for (const y of [1.2, 0.76, 0.32]) for (const x of [-0.155, 0.155]) slot(`slot_magazine_${String(++n).padStart(2, '0')}`, g, x, y, -0.03, deg(-12));
  return g;
}

// Ladder stand after the reference photo: two hinoki uprights leaning back
// slightly, an oak board behind the lower half, and dowel rungs on spacer
// blocks. Each paper drapes over a rung, turned on its side so the masthead
// runs down the right edge, overlapping the one above.
export const LADDER = { rungs: 6, top: 1.52, step: 0.135 };

function newspaperLadder(mats) {
  const k = new Kit();
  const LW = 0.38, X = LW / 2 + POST / 2, H = HEIGHT;
  // rungs step forward as they go down; the uprights follow the same lean
  const rungZ = (y) => 0.05 + 0.008 * (LADDER.top - y) / LADDER.step;
  const postZ = (y) => rungZ(y) - 0.03;
  const boardZ = (y) => postZ(y) - POST / 2 - 0.009;

  base(k, mats, LW / 2 + 0.06, boardZ(0.03) + BASE_AHEAD, 0.22);
  k.beam(V(0, 0.03, boardZ(0.03)), V(0, 1.0, boardZ(1.0)), LW + 0.07, 0.016, mats.oak);
  for (const s of [-1, 1]) {
    k.beam(V(s * X, 0.03, postZ(0.03)), V(s * X, H, postZ(H)), POST, POST, mats.hinoki);
    for (const y of [0.3, 0.72]) k.bolt(V(s * X, y, postZ(y) + POST / 2 + 0.002), V(0, 0, 1), mats.iron);
  }

  const hangW = NEWS.H, hangH = NEWS.W; // the folded paper, turned on its side
  const at = [];
  for (let i = 0; i < LADDER.rungs; i++) {
    const y = LADDER.top - i * LADDER.step;
    const z = rungZ(y);
    k.dowel(V(-X - 0.03, y, z), V(X + 0.03, y, z), 0.006, mats.hinoki);
    for (const s of [-1, 1]) {
      k.dowel(V(s * (LW / 2 - 0.045), y, z), V(s * (LW / 2 - 0.005), y, z), 0.0085, mats.sleeve);
      const z0 = postZ(y) - POST / 2, z1 = z + 0.012;
      k.beam(V(s * X, y - 0.055, (z0 + z1) / 2), V(s * X, y - 0.007, (z0 + z1) / 2), POST + 0.004, z1 - z0, mats.hinoki);
    }
    at.push([-hangW / 2, y - 0.008 - hangH / 2, z - 0.004]);
  }

  const g = k.build('newspaper_ladder');
  g.userData.boardZ = boardZ(0.03); // where its board meets the base, to line it up
  // where the photo-style camera aims: a point at rung depth, in this stand's space
  g.userData.shotFocus = (x, y) => new THREE.Vector3(x, y, rungZ(y));
  // slot at the paper's left edge, half way down; +Y turned to point right
  at.forEach(([x, y, z], i) => slot(`slot_newspaper_${String(i + 1).padStart(2, '0')}`, g, x, y, z, deg(-3.4), deg(-90)));
  return g;
}

// Builds the stands, and optionally a room around them. Returns the slots,
// found by name the same way loadModel() does for a GLB, and the group the
// camera should frame.
//   magazines: false leaves the magazine shelf out; the ladder stands alone
//   room: false skips walls and floor, for the seamless studio backdrop
export function buildPlaceholder(scene, { magazines = true, room: withRoom = true } = {}) {
  const mats = makeMaterials();
  const room = new THREE.Group();
  room.name = 'placeholder';

  if (withRoom) {
    // the room is large enough that orbiting never takes the camera through a wall
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), mats.floor);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), mats.wall);
    wall.position.set(0, 2.5, -0.5); wall.receiveShadow = true;
    // side walls close the room, so swinging the view shows a corner, not a void
    const side = (x) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), mats.wall);
      w.rotation.y = -Math.sign(x) * Math.PI / 2;
      w.position.set(x, 2.5, 5.5); w.receiveShadow = true;
      return w;
    };
    room.add(floor, wall, side(-6), side(6));
  }

  // stands on one line: back boards in the same plane, bases flush, a single
  // even gap between them; a lone stand sits at the centre
  const LINE_Z = -0.1, GAP = 0.3;
  const row = [];
  if (magazines) row.push([magazineRack(mats), 0.62 + 0.12 + 0.02]); // base slab widths
  row.push([newspaperLadder(mats), 0.38 + 0.12 + 0.02]);
  let x = -(row.reduce((w, [, rw]) => w + rw, 0) + GAP * (row.length - 1)) / 2;

  const stands = new THREE.Group();
  stands.name = 'focus';
  for (const [stand, w] of row) {
    stand.position.set(x + w / 2, 0, LINE_Z - stand.userData.boardZ);
    x += w + GAP;
    stands.add(stand);
  }
  room.add(stands);
  scene.add(room);
  const ladder = row.at(-1)[0];
  const shotFocus = (x, y) => ladder.localToWorld(ladder.userData.shotFocus(x, y));
  return { slots: collectSlots(room), focus: stands, shotFocus };
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
