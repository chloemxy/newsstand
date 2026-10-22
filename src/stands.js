// Placeholder stands in wood, after the reference photo: pale pine posts and
// blocks, an MDF back board on split MDF base slabs, steel rods with pink
// plastic sleeves, and dark screws with washers. They expose the same slots a GLB
// would (see models/README.md), so swapping in the real model is a config
// change.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeMaterials } from './materials.js';

const deg = THREE.MathUtils.degToRad;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TILE = { u: 0.45, v: 0.45 }; // metres covered by one tile of a scanned texture

// Collects geometry per material and merges it, so every board, block and
// dowel of a stand draws as a handful of meshes. Each piece gets UVs at real
// size (so grain density matches on a thin dowel and a wide board), its own
// grain offset, and a slight tone of its own, as real pieces of timber do.
class Kit {
  constructor() { this.parts = new Map(); this.seed = 1; }

  rand() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }

  // tone: a per-piece colour multiplier written as vertex colour
  add(geo, mat, tone = 1) {
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    const warm = 1 + (tone - 1) * 0.6; // darker pieces are a touch warmer
    for (let i = 0; i < n; i++) c.set([tone * warm, tone, tone / warm], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geo);
  }

  pieceTone() { return 0.9 + this.rand() * 0.16; }

  // a squared timber from a to b with eased edges; `across` sets which way
  // its width runs. UVs are box-projected in the piece's own space, so the
  // grain runs down its length on the long faces.
  beam(a, b, width, depth, mat, across = V(1, 0, 0)) {
    const L = b.clone().sub(a);
    const len = L.length();
    L.normalize();
    const W = across.clone().sub(L.clone().multiplyScalar(across.dot(L))).normalize();
    const D = W.clone().cross(L);
    const ease = Math.min(0.0022, Math.min(width, depth, len) * 0.2);
    const g = new RoundedBoxGeometry(width, len, depth, 2, ease);
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const du = this.rand(), dv = this.rand();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
      const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
      uv.setXY(i, u / TILE.u + du, v / TILE.v + dv);
    }
    g.applyMatrix4(new THREE.Matrix4().makeBasis(W, L, D).setPosition(a.clone().add(b).multiplyScalar(0.5)));
    this.add(g, mat, this.pieceTone());
  }

  // a round dowel from a to b
  dowel(a, b, r, mat, segments = 20) {
    const L = b.clone().sub(a), len = L.length();
    const g = new THREE.CylinderGeometry(r, r, len, segments, 1);
    const uv = g.attributes.uv, du = this.rand();
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (2 * Math.PI * r) / TILE.u + du, uv.getY(i) * len / TILE.v);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), L.normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    this.add(g, mat, this.pieceTone());
  }

  // a bolt head on a face, pointing along `normal`
  bolt(p, normal, mat) {
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), normal);
    // a washer, then a domed head
    const washer = new THREE.CylinderGeometry(0.009, 0.009, 0.0012, 20).applyQuaternion(q);
    washer.translate(p.x, p.y, p.z);
    const head = new THREE.SphereGeometry(0.0058, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).applyQuaternion(q);
    head.translate(p.x, p.y, p.z);
    this.add(washer, mat); this.add(head, mat);
  }

  build(name) {
    const g = new THREE.Group();
    g.name = name;
    for (const [mat, geos] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x))), mat);
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
  g.userData.width = RW + 0.12 + 0.02;
  let n = 0;
  for (const y of [1.2, 0.76, 0.32]) for (const x of [-0.155, 0.155]) slot(`slot_magazine_${String(++n).padStart(2, '0')}`, g, x, y, -0.03, deg(-12));
  return g;
}

// Ladder stand after the reference photo, two papers wide: three pine posts
// (two bays) leaning back slightly, an MDF board behind the lower half on
// split MDF base slabs, and a small pine block under each end of every rod.
// The rods belong to the newspapers (each paper is folded over its own
// rod), so picking a paper up lifts its rod off the blocks.
export const LADDER = { rungs: 7, bays: 2, top: 1.5, step: 0.1, rodR: 0.006 };

function newspaperLadder(mats) {
  const k = new Kit();
  const BAY = 0.42, H = HEIGHT, B = LADDER.bays;
  const pitch = BAY + POST;                        // post centre to post centre
  const postXs = Array.from({ length: B + 1 }, (_, i) => (i - B / 2) * pitch);
  const bayXs = Array.from({ length: B }, (_, i) => (i + 0.5 - B / 2) * pitch);
  const halfW = postXs.at(-1) + POST / 2;
  // each rung sits a little further forward than the one above, so the
  // papers shingle like the photo; the stand stays nearly upright
  const rungZ = (y) => 0.05 + 0.012 * (LADDER.top - y) / LADDER.step;
  const postZ = (y) => rungZ(y) - 0.03;
  const boardZ = (y) => postZ(y) - POST / 2 - 0.009;

  base(k, mats, halfW + 0.07, boardZ(0.03) + BASE_AHEAD, 0.26);
  k.beam(V(0, 0.03, boardZ(0.03)), V(0, 0.98, boardZ(0.98)), 2 * halfW + 0.04, 0.016, mats.oak);
  for (const x of postXs) {
    k.beam(V(x, 0.03, postZ(0.03)), V(x, H, postZ(H)), POST, POST, mats.hinoki);
    for (const y of [0.3, 0.75]) k.bolt(V(x, y, postZ(y) + POST / 2 + 0.002), V(0, 0, 1), mats.iron);
  }

  const rungs = [];
  for (let i = 0; i < LADDER.rungs; i++) {
    const y = LADDER.top - i * LADDER.step;
    const z = rungZ(y);
    // the blocks the rods rest on: from each post forward, top just under the
    // rods; the middle post's block carries the ends of both rods
    for (const x of postXs) {
      const z0 = postZ(y) - POST / 2, z1 = z + 0.012;
      k.beam(V(x, y - LADDER.rodR - 0.032, (z0 + z1) / 2), V(x, y - LADDER.rodR, (z0 + z1) / 2), POST + 0.004, z1 - z0, mats.hinoki);
    }
    rungs.push([y, z]);
  }

  const g = k.build('newspaper_ladder');
  g.userData.boardZ = boardZ(0.03); // where its board meets the base, to line it up
  g.userData.width = 2 * (halfW + 0.07); // base slab width
  // where the photo-style camera aims: a point at rung depth, in this stand's space
  g.userData.shotFocus = (x, y) => new THREE.Vector3(x, y, rungZ(y));
  // a slot on each rod's axis, one per bay per rung, filled down the left
  // column first; each paper brings its own rod, spanning its bay
  const rod = { half: pitch / 2 - 0.003, sleeveX: BAY / 2 - 0.03, metal: mats.steel, sleeve: mats.sleeve };
  let n = 0;
  bayXs.forEach((x) => rungs.forEach(([y, z]) => {
    const sl = slot(`slot_newspaper_${String(++n).padStart(2, '0')}`, g, x, y, z, deg(-4));
    sl.userData.rod = rod;
  }));
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
  if (magazines) row.push(magazineRack(mats));
  row.push(newspaperLadder(mats));
  let x = -(row.reduce((w, st) => w + st.userData.width, 0) + GAP * (row.length - 1)) / 2;

  const stands = new THREE.Group();
  stands.name = 'focus';
  for (const stand of row) {
    const w = stand.userData.width;
    stand.position.set(x + w / 2, 0, LINE_Z - stand.userData.boardZ);
    x += w + GAP;
    stands.add(stand);
  }
  room.add(stands);
  scene.add(room);
  const ladder = row.at(-1);
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
