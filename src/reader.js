// Hover, pick up, read, put back. Picking up is one continuous motion: a
// newspaper lifts off its rod, its fold relaxes as it travels to the camera,
// it straightens, then it flips open into a spread while it re-centres.
// Nothing fades: the stand stays in view behind the paper. A small control
// bar turns pages, and the page text is mirrored for screen readers.

import * as THREE from 'three';
import { tween, ease } from './anim.js';

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
    for (const it of items) {
      it.hover = 0;
      for (const part of [it.root, it.rod]) part?.traverse((o) => o.isMesh && this.meshes.push(o));
    }

    this.ui = {
      tip: $('tip'), bar: $('reader'), text: $('reader-text'), count: $('reader-count'),
      prev: $('reader-prev'), next: $('reader-next'), close: $('reader-close'), index: $('index-list'),
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
      // only the held paper itself, not the rod it left on the stand
      const own = [];
      this.held.root.traverse((o) => o.isMesh && own.push(o));
      const h = this.hit(e, own);
      if (!h) { this.putBack(); return; }
      // which half was clicked, measured in reading space
      const local = this.held.root.worldToLocal(h.point.clone());
      if (this.held.readQuat) local.applyQuaternion(this.held.readQuat);
      this.turn(local.x >= this.held.frame().cx ? 1 : -1);
    }
  }

  // Where the item sits in camera space for a given spread: as large as fits
  // between the top bar and the control bar, centred.
  heldPose(item, spread = item.spread) {
    const f = item.frame(spread);
    const vw = innerWidth, vh = innerHeight;
    const top = document.querySelector('.bar').offsetHeight;
    const bottom = vh - (this.ui.bar.offsetHeight || 72) - 24;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const availW = 1, availH = (bottom - top) / vh;
    const fill = item.readFill ?? 0.84;
    const d = Math.max(f.h / (2 * tanH * availH * fill), f.w / (2 * tanH * this.camera.aspect * availW * fill));
    const viewH = 2 * d * tanH;
    const sy = (0.5 - (top + bottom) / 2 / vh) * viewH;
    // the item's frame centre, turned into camera space
    const c = new THREE.Vector3(f.cx, f.cy, 0);
    const position = new THREE.Vector3(-c.x, sy - c.y, -d);
    // never slip behind the stand: hold closer and smaller by the same factor
    const near = this.bounds ? this.bounds.distanceToPoint(this.camera.position) : Infinity;
    const k = Math.min(1, (near * 0.8) / d);
    position.multiplyScalar(k);
    const quaternion = item.readQuat ? item.readQuat.clone() : new THREE.Quaternion();
    return { position, quaternion, scale: k };
  }

  // a point in the item's slot, expressed in camera space
  slotPoint(item, offset) {
    const world = item.slot.localToWorld(item.mount.clone().add(offset));
    return this.camera.worldToLocal(world);
  }

  slotQuat(item) {
    const q = item.slot.getWorldQuaternion(new THREE.Quaternion());
    return this.camera.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q);
  }

  async pick(item, opener) {
    if (this.state !== 'idle') return;
    this.state = 'busy';
    this.opener = opener;
    this.setHover(null);
    this.controls.enabled = false;
    document.body.classList.add('reading');
    item.hover = 0;
    if (item.applyHover) item.applyHover(0);
    else item.root.position.copy(item.mount);
    this.held = item;

    const root = item.root;
    this.camera.updateMatrixWorld();
    this.camera.attach(root);
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();

    // 1. lift off the rod: up and toward you, the fold starting to relax
    let pFrom = p0;
    if (item.liftOffset) {
      const pLift = this.slotPoint(item, item.liftOffset);
      await tween(380, (k) => {
        root.position.lerpVectors(p0, pLift, k);
        item.flatten?.(0.2 * k);
      }, ease.out);
      pFrom = pLift;
    }

    // 2. travel to you, straightening on the way
    const closed = this.heldPose(item, 0);
    await tween(820, (k) => {
      root.position.lerpVectors(pFrom, closed.position, k);
      root.position.y += Math.sin(Math.PI * k) * 0.03;
      root.quaternion.slerpQuaternions(q0, closed.quaternion, k);
      root.scale.lerpVectors(s0, new THREE.Vector3().setScalar(closed.scale), k);
      item.flatten?.(0.2 + 0.8 * k);
    });

    // 3. open, re-centring as the spread widens
    const open = this.heldPose(item, item.openSpread ?? 0);
    const pc = root.position.clone();
    await Promise.all([
      item.open(),
      tween(700, (k) => {
        root.position.lerpVectors(pc, open.position, k);
        root.scale.setScalar(THREE.MathUtils.lerp(closed.scale, open.scale, k));
      }, ease.out),
    ]);
    this.showControls();
    this.state = 'reading';
  }

  async putBack() {
    if (this.state !== 'reading') return;
    this.state = 'busy';
    const item = this.held, root = item.root;
    this.hideControls();

    // 1. close, re-centring as it narrows
    const closed = this.heldPose(item, 0);
    const pc = root.position.clone(), sc = root.scale.x;
    await Promise.all([
      item.close(),
      tween(600, (k) => {
        root.position.lerpVectors(pc, closed.position, k);
        root.scale.setScalar(THREE.MathUtils.lerp(sc, closed.scale, k));
      }),
    ]);

    // 2. travel back, the fold returning on the way
    this.camera.updateMatrixWorld();
    const q1 = this.slotQuat(item);
    const pHome = this.slotPoint(item, new THREE.Vector3());
    const pAbove = item.liftOffset ? this.slotPoint(item, item.liftOffset) : pHome;
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();
    await tween(760, (k) => {
      root.position.lerpVectors(p0, pAbove, k);
      root.position.y += Math.sin(Math.PI * k) * 0.03;
      root.quaternion.slerpQuaternions(q0, q1, k);
      root.scale.lerpVectors(s0, new THREE.Vector3(1, 1, 1), k);
      item.flatten?.(1 - 0.8 * k);
    });

    // 3. settle back over the rod
    if (item.liftOffset) {
      await tween(360, (k) => {
        root.position.lerpVectors(pAbove, pHome, k);
        item.flatten?.(0.2 * (1 - k));
      }, ease.inOut);
    }

    item.slot.add(root);
    root.position.copy(item.mount);
    root.quaternion.identity();
    root.scale.set(1, 1, 1);
    this.held = null;
    this.controls.enabled = true;
    this.state = 'idle';
    document.body.classList.remove('reading');
    (this.opener || this.canvas).focus({ preventScroll: true });
  }

  async turn(dir) {
    if (this.state !== 'reading') return;
    const item = this.held, root = item.root;
    const next = THREE.MathUtils.clamp(item.spread + dir, 0, item.spreadCount - 1);
    if (next === item.spread) return;
    this.state = 'busy';
    // re-centre in step with the page, since an open spread is wider
    const to = this.heldPose(item, next);
    const pc = root.position.clone(), sc = root.scale.x;
    await Promise.all([
      item.turn(dir),
      tween(600, (k) => {
        root.position.lerpVectors(pc, to.position, k);
        root.scale.setScalar(THREE.MathUtils.lerp(sc, to.scale, k));
      }),
    ]);
    this.renderControls();
    this.state = 'reading';
  }

  showControls() {
    this.renderControls();
    this.ui.bar.hidden = false;
    this.ui.next.focus({ preventScroll: true });
  }

  hideControls() {
    this.ui.bar.hidden = true;
  }

  renderControls() {
    const it = this.held, ui = this.ui;
    ui.count.textContent = it.positionLabel();
    ui.prev.disabled = it.spread === 0;
    ui.next.disabled = it.spread >= it.spreadCount - 1;
    // the pages as text, for screen readers
    ui.text.replaceChildren(...[it.title, ...it.visiblePages().map((i) => {
      const p = it.data.pages[i];
      return `${p.kicker}. ${p.headline}. ${p.body}`;
    })].map((t) => Object.assign(document.createElement('p'), { textContent: t })));
  }

  onResize() {
    if (this.state !== 'reading' || !this.held) return;
    const to = this.heldPose(this.held);
    this.held.root.position.copy(to.position);
    this.held.root.scale.setScalar(to.scale);
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 12);
    for (const it of this.items) {
      if (it === this.held) continue;
      const goal = it === this.hovered ? 1 : 0;
      if (Math.abs(it.hover - goal) < 0.001) continue;
      it.hover += (goal - it.hover) * k;
      if (it.applyHover) it.applyHover(it.hover); // newspapers tip up from one side
      else it.root.position.copy(it.mount).addScaledVector(it.hoverLift, it.hover);
    }
  }
}
