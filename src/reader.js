// Hover, pick up, read, put back. Picking up is one continuous motion: a
// newspaper and its rod lift off the blocks together, the rod slides out of
// the fold and goes back on the stand, and the paper straightens as it
// travels to the camera, flipping open into a spread before it arrives.
// Nothing fades: the stand stays in view behind the paper. A small control
// bar turns pages, and the page text is mirrored for screen readers.

import * as THREE from 'three';
import { tween, ease } from './anim.js';
import { sound } from './sound.js';

// k of a stage running from a to b ms, eased; 0 before it starts, 1 after
const seg = (t, a, b, e = ease.inOut) => e(THREE.MathUtils.clamp((t - a) / (b - a), 0, 1));
const linear = (k) => k;

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
      bar: $('reader'), text: $('reader-text'), count: $('reader-count'),
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
      const meta = document.createElement('small');
      meta.textContent = it.meta || '';
      b.append(it.title, meta);
      b.setAttribute('aria-label', `Pick up ${it.kind} ${it.title}`);
      b.addEventListener('click', () => { this.closeIndex(); this.pick(it, b); });
      li.append(b);
      this.ui.index.append(li);
    }
    const count = document.getElementById('index-count');
    if (count) count.textContent = String(this.items.length);

    // the list closes on a click anywhere outside it, or Escape; that
    // click only closes the list, it doesn't also pick up a paper
    this.details = this.ui.index.closest('details');
    const summary = this.details?.querySelector('summary');
    this.details?.addEventListener('toggle', () => {
      if (summary) summary.textContent = this.details.open ? 'Close' : 'Browse the stand';
      if (this.details.open) this.setHover(null);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.details?.open || this.details.contains(e.target)) return;
      this.closeIndex();
      e.stopPropagation();
    }, true);
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.details?.open) { this.closeIndex(); summary?.focus(); }
    });
  }

  closeIndex() { if (this.details) this.details.open = false; }

  bind() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; this.setHover(null, true); });
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
    if (this.state !== 'idle' || e.pointerType === 'touch' || e.buttons || this.details?.open) return;
    const h = this.hit(e, this.meshes);
    this.setHover(h ? h.object.userData.item : null);
  }

  setHover(item, quiet = false) {
    // brush the paper as the pointer arrives on a new one, panned to where it is
    // the rod clicks up off its block, and knocks back down when left (not
    // when the paper is being picked up, which has its own sound)
    if (item && item !== this.hovered) sound.hover(this.ndc.x * 0.6);
    if (!quiet && this.hovered && item !== this.hovered && this.state === 'idle') sound.unhover(this.ndc.x * 0.6);
    this.hovered = item;
    this.canvas.classList.toggle('over', !!item); // the scene's cursor (style.css)
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

    const root = item.root, rod = item.rod;
    item.castShadows?.(false); // in hand: lit, but no self-shadowing flicker
    this.camera.updateMatrixWorld();
    this.camera.attach(root);
    if (rod) this.camera.attach(rod);
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();
    const pLift = this.slotPoint(item, item.liftOffset ?? new THREE.Vector3());
    const rHome = this.slotPoint(item, new THREE.Vector3());
    const axis = rod ? new THREE.Vector3(1, 0, 0).applyQuaternion(rod.quaternion) : null;
    const out = (Math.sign(item.slot.position.x) || 1) * (2 * (item.rodHalf ?? 0.2) + 0.06);
    const rOut = pLift.clone().addScaledVector(axis ?? new THREE.Vector3(), out);
    const open = this.heldPose(item, item.openSpread ?? 0);
    const sOpen = new THREE.Vector3().setScalar(open.scale);
    sound.lift();

    // One timeline, its stages overlapping so nothing pauses (ms):
    //   0–300     paper and rod lift off the blocks together
    //   200–1100  the paper flies to you, straightening in the first 30%,
    //             its cover swinging open from there while still in flight;
    //             its shadows fade out as it leaves the stand's light
    //   150–650   meanwhile the rod slides out of the fold, outward from
    //             the stand, as the paper pulls away from it
    //   650–1250  the rod goes back onto its blocks
    const STRAIGHT = 0.3;
    const flight = open.position.clone().sub(pLift);
    let opening = null;
    await tween(1250, (k) => {
      const t = k * 1250;
      const L = seg(t, 0, 300, ease.out), S = seg(t, 150, 650), F = seg(t, 200, 1100), R = seg(t, 650, 1250);
      root.position.lerpVectors(p0, pLift, L).addScaledVector(flight, F);
      root.position.y += Math.sin(Math.PI * F) * 0.03;
      root.quaternion.slerpQuaternions(q0, open.quaternion, F);
      root.scale.lerpVectors(s0, sOpen, F);
      item.setShadowMix?.(1 - seg(t, 200, 500));
      if (rod) {
        if (R > 0) rod.position.lerpVectors(rOut, rHome, R);
        else rod.position.lerpVectors(p0, pLift, L).addScaledVector(axis, out * S);
      }
      if (opening) return;
      // the fold loosens as the rod leaves it, then straightens in flight
      item.flatten?.(0.2 * seg(t, 150, 400) + 0.8 * Math.min(1, F / STRAIGHT));
      if (F >= STRAIGHT) {
        sound.open();
        opening = item.open(600);
      }
    }, linear);
    if (rod) {
      item.slot.add(rod);
      rod.position.copy(item.mount);
      rod.quaternion.identity();
    }
    await opening;
    this.showControls();
    this.state = 'reading';
  }

  async putBack() {
    if (this.state !== 'reading') return;
    this.state = 'busy';
    const item = this.held, root = item.root;
    this.hideControls();
    sound.putBack();

    this.camera.updateMatrixWorld();
    const q1 = this.slotQuat(item);
    const lift = item.liftOffset ?? new THREE.Vector3();
    const pHome = this.slotPoint(item, new THREE.Vector3());
    const pHigh = this.slotPoint(item, lift.clone().add(new THREE.Vector3(0, item.dropHeight ?? 0, 0)));
    const p0 = root.position.clone(), q0 = root.quaternion.clone(), s0 = root.scale.clone();
    const one = new THREE.Vector3(1, 1, 1);
    const rod = item.rod;
    let axis = new THREE.Vector3(), out = 0;
    if (rod) {
      this.camera.attach(rod);
      axis = new THREE.Vector3(1, 0, 0).applyQuaternion(rod.quaternion);
      out = (Math.sign(item.slot.position.x) || 1) * (2 * (item.rodHalf ?? 0.2) + 0.06);
    }
    const rodHome = rod?.position.clone();
    const drop = pHome.clone().sub(pHigh);

    // One timeline, the reverse of picking up, stages overlapping (ms):
    //   0–650     the cover closes (item.close runs its own swing)
    //   400–1100  the paper flies back to a point above its slot, high
    //             enough to clear the papers below; its shadows fade in
    //             as it comes back into the stand's light
    //   800–1150  the paper folds over again, opening a fold for the rod
    //   1000–1750 it drops in one unbroken motion to its slot, in front of
    //             the papers above and behind those below
    //   600–1100  the rod lifts off its blocks in one move, up to the
    //             falling fold and out beside the bay
    //   1100–1550 and slides straight into it, riding down inside the fold,
    //             so it never shows through the sheet
    const foldAtInsert = pHigh.clone().addScaledVector(drop, seg(1100, 1000, 1750));
    const closing = item.close();
    await tween(1750, (k) => {
      const t = k * 1750;
      const B = seg(t, 400, 1100), D = seg(t, 1000, 1750);
      root.position.lerpVectors(p0, pHigh, B).addScaledVector(drop, D);
      root.position.y += Math.sin(Math.PI * B) * 0.03;
      root.quaternion.slerpQuaternions(q0, q1, B);
      root.scale.lerpVectors(s0, one, B);
      item.setShadowMix?.(seg(t, 800, 1100));
      if (t >= 650) item.flatten?.(1 - seg(t, 800, 1150));
      // rises straight to where the fold will be when it goes in, then
      // follows the fold down
      if (t < 1100) rod?.position.lerpVectors(rodHome, foldAtInsert, seg(t, 600, 1100)).addScaledVector(axis, out * seg(t, 600, 1100));
      else rod?.position.copy(root.position).addScaledVector(axis, out * (1 - seg(t, 1100, 1550)));
    }, linear);
    await closing;

    if (rod) {
      item.slot.add(rod);
      rod.position.copy(item.mount);
      rod.quaternion.identity();
    }
    item.castShadows?.(true);
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
