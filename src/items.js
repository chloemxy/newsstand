// Interactive magazines and newspapers. Each is built in code with hinges
// (a cover that swings open, a fold that drops down) so the open and page
// turn animations work whatever stand model they sit on.
//
// Local space for both: +Y up the page, +Z out of the cover, origin at the
// centre of the closed item. `mount` is where the item sits inside a slot,
// whose origin is the bottom-centre of the item's back face.

import * as THREE from 'three';
import { tween, ease } from './anim.js';
import { PAPER, paintCover, paintMagPage, paintNewsPage, paintNewsBack, loadImage } from './textures.js';

export const MAG = { W: 0.21, H: 0.28, T: 0.006, C: 0.0012 };
// tabloid page: W is the page width (spine to edge), H its height
export const NEWS = { W: 0.29, H: 0.38 };

let anisotropy = 4;
export function setAnisotropy(n) { anisotropy = n; }

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

// BoxGeometry material order: +x, -x, +y, -y, +z (front), -z (back)
const faces = (side, front, back) => [side, side, side, side, front, back];

const pageMat = () => new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 });

function setMap(mat, texture) {
  mat.map = texture || null;
  mat.color.set(texture ? 0xffffff : PAPER);
  mat.needsUpdate = true;
}

function markMeshes(root, item) {
  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.item = item; }
  });
}

export class Magazine {
  constructor(data) {
    const { W, H, T, C } = MAG;
    this.kind = 'magazine';
    this.data = data;
    this.spread = 0;
    this.cache = new Map();
    this.mount = new THREE.Vector3(0, H / 2, T / 2);
    this.hoverLift = new THREE.Vector3(0, 0.008, 0.03); // up and out of the shelf

    this.root = new THREE.Group();
    this.root.name = `magazine_${data.id}`;

    const side = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 });
    const coverEdge = new THREE.MeshStandardMaterial({ color: data.cover.bg, roughness: 0.5 });
    const coverTex = tex(paintCover(data));
    const coverMat = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.4 });
    if (data.cover.image) loadImage(data.cover.image).then((img) => { coverTex.image = paintCover(data, img); coverTex.needsUpdate = true; });

    this.leftMat = pageMat();
    this.rightMat = pageMat();
    this.leafFront = pageMat();
    this.leafBack = pageMat();

    // the page block, its front face is the right-hand page when open
    const block = new THREE.Mesh(new THREE.BoxGeometry(W, H, T - C), faces(side, this.rightMat, coverEdge));
    block.position.z = -C / 2;

    // front cover, hinged at the spine (left edge); its back face is the left-hand page
    this.coverPivot = new THREE.Group();
    this.coverPivot.position.set(-W / 2, 0, T / 2 - C / 2);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(W, H, C), faces(coverEdge, coverMat, this.leftMat));
    cover.position.x = W / 2;
    this.coverPivot.add(cover);

    // a single loose leaf used only while a page turns
    this.leafPivot = new THREE.Group();
    this.leafPivot.position.set(-W / 2, 0, T / 2 + 0.001);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.0004), faces(side, this.leafFront, this.leafBack));
    leaf.position.x = W / 2;
    this.leafPivot.add(leaf);
    this.leafPivot.visible = false;

    this.root.add(block, this.coverPivot, this.leafPivot);
    markMeshes(this.root, this);
    this.showSpread(0);
  }

  get pageCount() { return this.data.pages.length; }
  get spreadCount() { return Math.ceil(this.pageCount / 2); }
  get title() { return this.data.title; }
  get meta() { return this.data.issue; }
  visiblePages() { return [2 * this.spread, 2 * this.spread + 1].filter((i) => i < this.pageCount); }
  positionLabel() {
    const [a, b] = this.visiblePages().map((i) => i + 2);
    return b ? `Pages ${a}–${b} of ${this.pageCount + 1}` : `Page ${a} of ${this.pageCount + 1}`;
  }

  // the area the open item covers, in local space
  frame(open = true) {
    const { W, H } = MAG;
    return open ? { w: 2 * W, h: H, cx: -W / 2, cy: 0 } : { w: W, h: H, cx: 0, cy: 0 };
  }

  page(i) {
    const p = this.data.pages[i];
    if (!p) return null;
    if (!this.cache.has(i)) {
      const t = tex(paintMagPage(p, i + 2, this.data));
      if (p.image) loadImage(p.image).then((img) => { t.image = paintMagPage(p, i + 2, this.data, img); t.needsUpdate = true; });
      this.cache.set(i, t);
    }
    return this.cache.get(i);
  }

  showSpread(s) {
    this.spread = s;
    setMap(this.leftMat, this.page(2 * s));
    setMap(this.rightMat, this.page(2 * s + 1));
  }

  open() { return tween(700, (k) => { this.coverPivot.rotation.y = -Math.PI * k; }, ease.out); }

  async close() {
    await tween(500, (k) => { this.coverPivot.rotation.y = -Math.PI * (1 - k); });
    this.showSpread(0);
  }

  async turn(dir) {
    const s = this.spread, n = s + dir;
    if (n < 0 || n >= this.spreadCount) return false;
    const leaf = this.leafPivot;
    leaf.visible = true;
    if (dir > 0) {
      setMap(this.leafFront, this.page(2 * s + 1));
      setMap(this.leafBack, this.page(2 * n));
      setMap(this.rightMat, this.page(2 * n + 1));
      await tween(550, (k) => { leaf.rotation.y = -Math.PI * k; });
      setMap(this.leftMat, this.page(2 * n));
    } else {
      setMap(this.leafBack, this.page(2 * s));
      setMap(this.leafFront, this.page(2 * n + 1));
      setMap(this.leftMat, this.page(2 * n));
      await tween(550, (k) => { leaf.rotation.y = -Math.PI * (1 - k); });
      setMap(this.rightMat, this.page(2 * n + 1));
    }
    leaf.visible = false;
    this.spread = n;
    return true;
  }
}

// A tabloid newspaper on its rod, built from real folded sheets.
//
// Hanging (as on the stand): the spine wraps over the rod, which runs along
// local X through the origin. The front half hangs in front of the rod and
// the back half behind it, each with a slight sag and a curl at the edge.
// Four nested sheets show as separate layers at the fold and the edges.
// The page is turned on its side: page width runs down (-Y) from the spine,
// page height runs along X with the masthead on the right (+X).
//
// Picked up, the sheets straighten (a morph target) into a flat, closed
// paper; the reader turns it upright with `readQuat`, so the rod runs down
// the left spine like a library newspaper stick.
const SHEETS = 4;
const DOWEL_R = 0.006;

function sheetGeometry(layer, W, H) {
  const outer = SHEETS - 1 - layer; // 0 = innermost sheet
  const rHang = DOWEL_R + 0.0008 + outer * 0.0004;
  const rFlat = 0.0004 + outer * 0.0005;
  const bow = 0.003 + layer * 0.0004;   // sag away from the rod
  const curl = 0.006 + layer * 0.0008;  // the free edge lifts a little
  const S = 28, A = 18, X = 6;          // segments: each half, the fold, across

  // path down the sheet: [hangY, hangZ, flatY, flatZ, u, half]; half 0 = front
  const path = [];
  for (let i = 0; i <= S; i++) {
    const f = i / S; // 0 at the free edge, 1 at the fold
    path.push([-(1 - f) * W, rHang + bow * Math.sin(Math.PI * f) + curl * (1 - f) ** 3, -(1 - f) * W, rFlat, 1 - f, 0]);
  }
  for (let i = 1; i < A; i++) {
    const t = (Math.PI * i) / A;
    path.push([rHang * Math.sin(t), rHang * Math.cos(t), rFlat * Math.sin(t) * 0.2, rFlat * Math.cos(t), 0, i < A / 2 ? 0 : 1]);
  }
  for (let i = 0; i <= S; i++) {
    const g = i / S; // 0 at the fold, 1 at the free edge
    path.push([-g * W, -(rHang + bow * 0.6 * Math.sin(Math.PI * g) + curl * 0.3 * g ** 3), -g * W, -rFlat, g, 1]);
  }

  const pos = [], flat = [], uv = [];
  for (const [hy, hz, fy, fz, u] of path) {
    for (let j = 0; j <= X; j++) {
      const v = j / X, x = (v - 0.5) * H;
      pos.push(x, hy, hz); flat.push(x, fy, fz); uv.push(u, v);
    }
  }
  const index = [], front = [], back = [];
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < X; j++) {
      const a = i * (X + 1) + j, b = a + X + 1;
      (path[i][5] === 0 ? front : back).push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  index.push(...front, ...back);
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.addGroup(0, front.length, 0);
  g.addGroup(front.length, back.length, 1);
  g.computeVertexNormals();
  const f = g.clone();
  f.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
  f.computeVertexNormals();
  g.morphAttributes.position = [f.attributes.position];
  g.morphAttributes.normal = [f.attributes.normal];
  return g;
}

const defaultRod = {
  half: 0.25, sleeveX: 0.19,
  wood: new THREE.MeshStandardMaterial({ color: '#e8d4b4', roughness: 0.7 }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#cdb0c4', roughness: 0.35 }),
};

export class Newspaper {
  constructor(data, slotData = {}) {
    const { W, H } = NEWS;
    const rod = { ...defaultRod, ...(slotData.rod || {}) };
    this.kind = 'newspaper';
    this.data = data;
    this.spread = 0;
    this.cache = new Map();
    this.mount = new THREE.Vector3(0, 0, 0);          // the slot sits on the rod's axis
    this.hoverLift = new THREE.Vector3(0, 0.012, 0.02); // lifts off its blocks
    this.readQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

    this.root = new THREE.Group();
    this.root.name = `newspaper_${data.id}`;

    // the rod and its sleeves travel with the paper
    const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(DOWEL_R, DOWEL_R, rod.half * 2, 20).rotateZ(Math.PI / 2), rod.wood);
    this.root.add(rodMesh);
    for (const s of [-1, 1]) {
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(DOWEL_R + 0.0022, DOWEL_R + 0.0022, 0.045, 20).rotateZ(Math.PI / 2), rod.sleeve);
      sl.position.x = s * rod.sleeveX;
      this.root.add(sl);
    }

    // the sheets, on a pivot through the page's vertical centre for page turns
    this.frontMat = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide });
    this.backMat = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide, map: tex(paintNewsBack(data)) });
    const inner = new THREE.MeshStandardMaterial({ color: '#e6dfcf', roughness: 0.95, side: THREE.DoubleSide });
    this.pivot = new THREE.Group();
    this.pivot.position.y = -W / 2;
    this.sheets = [];
    for (let i = 0; i < SHEETS; i++) {
      const m = new THREE.Mesh(sheetGeometry(i, W, H), i === 0 ? [this.frontMat, this.backMat] : [inner, inner]);
      m.position.y = W / 2;
      m.morphTargetInfluences = [0];
      this.pivot.add(m);
      this.sheets.push(m);
    }
    this.root.add(this.pivot);
    markMeshes(this.root, this);
    this.showSpread(0);
  }

  get pageCount() { return this.data.pages.length; }
  get spreadCount() { return this.pageCount; }
  get title() { return this.data.title; }
  get meta() { return this.data.date; }
  visiblePages() { return [this.spread]; }
  positionLabel() { return `Page ${this.spread + 1} of ${this.pageCount}`; }

  // the area the paper covers, in reading (camera) space after readQuat:
  // the spine on the left at x = 0, the page to its right
  frame() {
    const { W, H } = NEWS;
    return { w: W, h: H, cx: W / 2, cy: 0 };
  }

  page(i) {
    if (!this.cache.has(i)) {
      const p = this.data.pages[i];
      const t = tex(paintNewsPage(this.data, p, i));
      if (p.image) loadImage(p.image).then((img) => { t.image = paintNewsPage(this.data, p, i, img); t.needsUpdate = true; });
      this.cache.set(i, t);
    }
    return this.cache.get(i);
  }

  showSpread(i) {
    this.spread = i;
    setMap(this.frontMat, this.page(i));
  }

  flatten(k) { for (const m of this.sheets) m.morphTargetInfluences[0] = k; }

  open() { return tween(700, (k) => this.flatten(k), ease.out); }

  async close() {
    await tween(600, (k) => this.flatten(1 - k));
    this.showSpread(0);
  }

  // spin the paper over like turning a sheet, swapping the page half way
  async turn(dir) {
    const n = this.spread + dir;
    if (n < 0 || n >= this.pageCount) return false;
    const s = Math.sign(dir);
    await tween(220, (k) => { this.pivot.rotation.x = s * (Math.PI / 2) * k; }, ease.in);
    this.showSpread(n);
    await tween(260, (k) => { this.pivot.rotation.x = -s * (Math.PI / 2) * (1 - k); }, ease.out);
    return true;
  }
}
