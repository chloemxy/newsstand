// Interactive magazines and newspapers. Each is built in code with hinges
// (a cover that swings open, a fold that drops down) so the open and page
// turn animations work whatever stand model they sit on.
//
// Local space for both: +Y up the page, +Z out of the cover, origin at the
// centre of the closed item. `mount` is where the item sits inside a slot,
// whose origin is the bottom-centre of the item's back face.

import * as THREE from 'three';
import { tween, ease } from './anim.js';
import { PAPER, NEWSPRINT, paintCover, paintMagPage, paintNewsPage, loadImage } from './textures.js';

export const MAG = { W: 0.21, H: 0.28, T: 0.006, C: 0.0012 };
export const NEWS = { W: 0.38, H: 0.29, T: 0.003 };

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

export class Newspaper {
  constructor(data) {
    const { W, H, T } = NEWS;
    this.kind = 'newspaper';
    this.data = data;
    this.spread = 0;
    this.cache = new Map();
    this.mount = new THREE.Vector3(0, H / 2, T * 1.5);

    this.root = new THREE.Group();
    this.root.name = `newspaper_${data.id}`;

    const side = new THREE.MeshStandardMaterial({ color: NEWSPRINT, roughness: 0.95 });
    this.topMat = new THREE.MeshStandardMaterial({ roughness: 0.92 });
    this.bottomMat = new THREE.MeshStandardMaterial({ roughness: 0.92 });

    // `sheet` spins when the page changes
    this.sheet = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), faces(side, this.topMat, side));

    // bottom half, folded up behind the top half; it drops down to unfold
    this.foldPivot = new THREE.Group();
    this.foldPivot.position.set(0, -H / 2, -T);
    this.foldPivot.rotation.x = Math.PI;
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), faces(side, this.bottomMat, side));
    bottom.position.y = -H / 2;
    this.foldPivot.add(bottom);

    this.sheet.add(top, this.foldPivot);
    this.root.add(this.sheet);
    markMeshes(this.root, this);
    this.showSpread(0);
  }

  get pageCount() { return this.data.pages.length; }
  get spreadCount() { return this.pageCount; }
  get title() { return this.data.title; }
  get meta() { return this.data.date; }
  visiblePages() { return [this.spread]; }
  positionLabel() { return `Page ${this.spread + 1} of ${this.pageCount}`; }

  frame(open = true) {
    const { W, H } = NEWS;
    return open ? { w: W, h: 2 * H, cx: 0, cy: -H / 2 } : { w: W, h: H, cx: 0, cy: 0 };
  }

  // one canvas per page, shown as two textures (top and bottom half)
  page(i) {
    if (!this.cache.has(i)) {
      const p = this.data.pages[i];
      const full = tex(paintNewsPage(this.data, p, i));
      const top = full.clone(); top.repeat.set(1, 0.5); top.offset.set(0, 0.5); top.needsUpdate = true;
      const bottom = full.clone(); bottom.repeat.set(1, 0.5); bottom.needsUpdate = true;
      if (p.image) loadImage(p.image).then((img) => {
        const c = paintNewsPage(this.data, p, i, img);
        for (const t of [top, bottom]) { t.image = c; t.needsUpdate = true; }
      });
      this.cache.set(i, { top, bottom });
    }
    return this.cache.get(i);
  }

  showSpread(i) {
    this.spread = i;
    const { top, bottom } = this.page(i);
    setMap(this.topMat, top);
    setMap(this.bottomMat, bottom);
  }

  open() {
    const { T } = NEWS;
    return tween(750, (k) => {
      this.foldPivot.rotation.x = Math.PI * (1 - k);
      this.foldPivot.position.z = -T * (1 - k);
    }, ease.out);
  }

  async close() {
    const { T } = NEWS;
    await tween(500, (k) => {
      this.foldPivot.rotation.x = Math.PI * k;
      this.foldPivot.position.z = -T * k;
    });
    this.showSpread(0);
  }

  async turn(dir) {
    const n = this.spread + dir;
    if (n < 0 || n >= this.pageCount) return false;
    const s = Math.sign(dir);
    await tween(220, (k) => { this.sheet.rotation.y = s * (Math.PI / 2) * k; }, ease.in);
    this.showSpread(n);
    await tween(260, (k) => { this.sheet.rotation.y = -s * (Math.PI / 2) * (1 - k); }, ease.out);
    return true;
  }
}
