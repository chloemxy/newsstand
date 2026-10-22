// Hover, pick up, open, turn pages, put back. The held item is parented to
// the camera so it stays framed while reading, and the reader panel shows
// the same pages as real text.

import * as THREE from 'three';
import { tween, ease } from './anim.js';

const PANEL_W = 448;     // panel width + its margin, keep in sync with --panel-w
const SHEET = 0.45;      // phone bottom sheet height, share of the viewport
const WIDE = 900;
const $ = (id) => document.getElementById(id);

export class Reader {
  constructor({ camera, controls, canvas, items, bounds }) {
    // bounds: the stands' box, so a held item always sits in front of them
    Object.assign(this, { camera, controls, canvas, items, bounds });
    this.state = 'idle';
    this.held = null;
    this.hovered = null;
    this.opener = null;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.meshes = [];
    for (const it of items) { it.hover = 0; it.root.traverse((o) => o.isMesh && this.meshes.push(o)); }

    this.dim = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }),
    );
    this.dim.visible = false;
    this.dimTarget = 0;
    camera.add(this.dim);

    // a soft light over the reader's shoulder, only on while reading
    this.lamp = new THREE.DirectionalLight('#fff4e2', 0);
    this.lamp.position.set(0.4, 0.6, 0.3);
    this.lamp.target.position.set(0, 0, -1);
    camera.add(this.lamp, this.lamp.target);

    this.ui = {
      tip: $('tip'), panel: $('reader'), kind: $('reader-kind'), title: $('reader-title'), meta: $('reader-meta'),
      pages: $('reader-pages'), count: $('reader-count'), prev: $('reader-prev'), next: $('reader-next'),
      close: $('reader-close'), index: $('index-list'),
    };
    this.buildIndex();
    this.bind();
  }

  buildIndex() {
    for (const it of this.items) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${it.title}`;
      b.setAttribute('aria-label', `Pick up ${it.kind} ${it.title}`);
      b.addEventListener('click', () => this.pick(it, b));
      li.append(b);
      this.ui.index.append(li);
    }
  }

  bind() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; this.setHover(null); });
    c.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      this.click(e);
    });
    c.addEventListener('pointermove', (e) => this.move(e));
    c.addEventListener('pointerleave', () => this.setHover(null));
    this.ui.prev.addEventListener('click', () => this.turn(-1));
    this.ui.next.addEventListener('click', () => this.turn(1));
    this.ui.close.addEventListener('click', () => this.putBack());
    addEventListener('keydown', (e) => {
      if (this.state !== 'reading') return;
      if (e.key === 'Escape') this.putBack();
      else if (e.key === 'ArrowRight') this.turn(1);
      else if (e.key === 'ArrowLeft') this.turn(-1);
    });
  }

  hit(e, meshes) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.intersectObjects(meshes, false)[0] || null;
  }

  move(e) {
    // no hover while dragging the view, or items pop forward as the cursor sweeps past
    if (this.state !== 'idle' || e.pointerType === 'touch' || e.buttons) return;
    const h = this.hit(e, this.meshes);
    this.setHover(h ? h.object.userData.item : null);
    if (this.hovered) {
      const tip = this.ui.tip;
      tip.textContent = `${this.hovered.title} · Pick up`;
      tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
    }
  }

  setHover(item) {
    this.hovered = item;
    this.ui.tip.hidden = !item;
    this.canvas.style.cursor = item ? 'pointer' : '';
  }

  click(e) {
    if (this.state === 'idle') {
      const h = this.hit(e, this.meshes);
      if (h) this.pick(h.object.userData.item, null);
    } else if (this.state === 'reading') {
      const own = this.meshes.filter((m) => m.userData.item === this.held);
      const h = this.hit(e, own);
      if (!h) { this.putBack(); return; }
      // which half was clicked, measured in reading space
      const local = this.held.root.worldToLocal(h.point.clone());
      if (this.held.readQuat) local.applyQuaternion(this.held.readQuat);
      this.turn(local.x >= this.held.frame(true).cx ? 1 : -1);
    }
  }

  // where the open item sits in camera space: as large as fits beside the panel
  heldPose(item) {
    const f = item.frame(true);
    const vw = innerWidth, vh = innerHeight, wide = vw >= WIDE;
    const bar = document.querySelector('.bar').offsetHeight;
    // the free area in px, between the top bar and the panel or sheet
    const free = wide
      ? { l: 0, r: vw - PANEL_W, t: bar, b: vh }
      : { l: 0, r: vw, t: bar, b: vh * (1 - SHEET) };
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const availW = (free.r - free.l) / vw, availH = (free.b - free.t) / vh;
    const fill = item.readFill ?? 0.84; // share of the free area the item may take
    const d = Math.max(f.h / (2 * tanH * availH * fill), f.w / (2 * tanH * this.camera.aspect * availW * fill));
    const viewH = 2 * d * tanH, viewW = viewH * this.camera.aspect;
    const sx = ((free.l + free.r) / 2 / vw - 0.5) * viewW;
    const sy = (0.5 - (free.t + free.b) / 2 / vh) * viewH;
    const position = new THREE.Vector3(sx - f.cx, sy - f.cy, -d);
    // With a close camera the stand can be nearer than that. Then hold the
    // item closer and smaller by the same factor, so it looks the same size
    // but never slips behind a post.
    const near = this.bounds ? this.bounds.distanceToPoint(this.camera.position) : Infinity;
    const k = Math.min(1, (near * 0.8) / d);
    position.multiplyScalar(k);
    // the dimmer goes between the held item and the stand
    const dimZ = -Math.min(d * k + 0.15, Math.max(d * k + 0.005, near * 0.95));
    // a newspaper turns upright so its rod runs down the left spine
    const quaternion = item.readQuat ? item.readQuat.clone() : new THREE.Quaternion();
    return { position, quaternion, d: d * k, scale: k, dimZ };
  }

  async pick(item, opener) {
    if (this.state !== 'idle') return;
    this.state = 'busy';
    this.opener = opener;
    this.setHover(null);
    this.controls.enabled = false;
    document.body.classList.add('reading');
    item.hover = 0;
    item.root.position.copy(item.mount);
    this.held = item;

    const root = item.root;
    this.camera.updateMatrixWorld();
    this.camera.attach(root);
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();
    const to = this.heldPose(item);
    this.dim.position.z = to.dimZ;
    this.dim.visible = true;
    this.dimTarget = 0.85;

    await tween(800, (k) => {
      root.position.lerpVectors(p0, to.position, k);
      root.position.y += Math.sin(Math.PI * k) * 0.04;
      root.quaternion.slerpQuaternions(q0, to.quaternion, k);
      root.scale.lerpVectors(s0, new THREE.Vector3().setScalar(to.scale), k);
    });
    await item.open();
    this.showPanel();
    this.state = 'reading';
  }

  async putBack() {
    if (this.state !== 'reading') return;
    this.state = 'busy';
    const item = this.held, root = item.root;
    this.hidePanel();
    this.dimTarget = 0;
    await item.close();

    // the home pose, expressed in camera space
    const home = item.slot.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(item.mount));
    const local = this.camera.matrixWorld.clone().invert().multiply(home);
    const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3();
    local.decompose(p1, q1, s1);
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();
    await tween(700, (k) => {
      root.position.lerpVectors(p0, p1, k);
      root.position.y += Math.sin(Math.PI * k) * 0.04;
      root.quaternion.slerpQuaternions(q0, q1, k);
      root.scale.lerpVectors(s0, s1, k);
    });

    item.slot.add(root);
    root.position.copy(item.mount);
    root.quaternion.identity();
    root.scale.set(1, 1, 1);
    this.held = null;
    this.controls.enabled = true;
    this.state = 'idle';
    (this.opener || this.canvas).focus({ preventScroll: true });
  }

  async turn(dir) {
    if (this.state !== 'reading') return;
    this.state = 'busy';
    const moved = await this.held.turn(dir);
    if (moved) this.renderPanel();
    this.state = 'reading';
  }

  showPanel() {
    this.renderPanel();
    document.body.classList.add('reading');
    this.ui.panel.hidden = false;
    requestAnimationFrame(() => this.ui.panel.classList.add('open'));
    this.ui.close.focus({ preventScroll: true });
  }

  hidePanel() {
    const p = this.ui.panel;
    p.classList.remove('open');
    document.body.classList.remove('reading');
    setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 250);
  }

  renderPanel() {
    const it = this.held, ui = this.ui;
    ui.kind.textContent = it.kind === 'magazine' ? 'Magazine' : 'Newspaper';
    ui.title.textContent = it.title;
    ui.meta.textContent = it.meta;
    ui.count.textContent = it.positionLabel();
    ui.prev.disabled = it.spread === 0;
    ui.next.disabled = it.spread >= it.spreadCount - 1;
    ui.pages.replaceChildren(...it.visiblePages().map((i) => {
      const p = it.data.pages[i];
      const a = document.createElement('article');
      const k = document.createElement('p'); k.className = 'kicker'; k.textContent = p.kicker || '';
      const h = document.createElement('h3'); h.textContent = p.headline || 'Image page';
      const b = document.createElement('p'); b.textContent = p.body || '';
      a.append(k, h, b);
      return a;
    }));
  }

  onResize() {
    if (this.state !== 'reading' || !this.held) return;
    const to = this.heldPose(this.held);
    this.held.root.position.copy(to.position);
    this.held.root.scale.setScalar(to.scale);
    this.dim.position.z = to.dimZ;
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 12);
    for (const it of this.items) {
      if (it === this.held) continue;
      const goal = it === this.hovered ? 1 : 0;
      if (Math.abs(it.hover - goal) < 0.001) continue;
      it.hover += (goal - it.hover) * k;
      it.root.position.copy(it.mount).addScaledVector(it.hoverLift, it.hover);
    }
    const m = this.dim.material;
    m.opacity += (this.dimTarget - m.opacity) * (1 - Math.exp(-dt * 8));
    this.lamp.intensity += (this.dimTarget * 1.2 - this.lamp.intensity) * (1 - Math.exp(-dt * 8));
    if (this.dimTarget === 0 && m.opacity < 0.01) { m.opacity = 0; this.dim.visible = false; }
  }
}
