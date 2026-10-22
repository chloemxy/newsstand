import * as THREE from 'three';
import { CONFIG } from './config.js';
import { magazines, newspapers } from './content.js';
import { loadFonts } from './textures.js';
import { Magazine, Newspaper, setAnisotropy } from './items.js';
import { buildPlaceholder } from './stands.js';
import { loadModel } from './model.js';
import { Reader } from './reader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { setMaterialAnisotropy } from './materials.js';
import { makePost } from './post.js';
import { ContactShadow } from './contact-shadow.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

const studio = CONFIG.look === 'studio';

async function start() {
  await loadFonts();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // VSM bled light and shimmered at grazing angles
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  setAnisotropy(renderer.capabilities.getMaxAnisotropy());
  setMaterialAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  // studio: a seamless paper sweep, lighter at the top, with no horizon line
  scene.background = studio ? studioBackdrop() : new THREE.Color('#ead5bd');
  // a soft room for the oiled wood to catch highlights from
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = studio ? 0.5 : 0.22;

  const shot = CONFIG.shot;
  const camera = new THREE.PerspectiveCamera(shot.fov, 1, 0.02, 80);
  scene.add(camera); // the held item and the dimmer ride along with it

  // The view is fixed, so there are no orbit controls; the reader only
  // needs to know whether the camera is free (it never moves anyway).
  const controls = { enabled: true };

  if (CONFIG.defaultLights) (studio ? addStudioLights : addSunsetLights)(scene);

  // the direction the camera looks from; the distance is worked out to fit
  const viewDir = new THREE.Vector3(
    Math.sin(shot.azimuth) * Math.cos(shot.elevation),
    Math.sin(shot.elevation),
    Math.cos(shot.azimuth) * Math.cos(shot.elevation),
  );

  let slots, focus, shotFocus;
  if (CONFIG.modelUrl) {
    const model = await loadModel(CONFIG.modelUrl, scene, CONFIG.cameraName, CONFIG.focusName);
    ({ slots, focus } = model);
    if (model.camera) {
      model.camera.updateWorldMatrix(true, false);
      viewDir.set(0, 0, 1).applyQuaternion(model.camera.getWorldQuaternion(new THREE.Quaternion()));
      if (model.camera.isPerspectiveCamera) camera.fov = model.camera.fov;
    }
  } else {
    ({ slots, focus, shotFocus } = buildPlaceholder(scene, { magazines: CONFIG.showMagazines, room: !studio }));
  }

  const items = [];
  const place = (list, slotList, Make) => list.forEach((data, i) => {
    const slot = slotList[i];
    if (!slot) { console.warn(`No slot for "${data.title}". Add more slots to the model.`); return; }
    const item = new Make(data, slot.userData);
    item.slot = slot;
    item.root.position.copy(item.mount);
    slot.add(item.root);
    items.push(item);
  });
  if (CONFIG.modelUrl || CONFIG.showMagazines) place(magazines, slots.magazines, Magazine);
  place(newspapers, slots.newspapers, Newspaper);

  focus.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(focus);
  const reader = new Reader({ camera, controls, canvas, items, bounds });
  const post = makePost(renderer, scene, camera);
  window.kiosk = { scene, camera, controls, reader, items }; // handy in the devtools console

  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  // no floor in the studio, so a soft contact shadow grounds the stand
  const contact = studio ? new ContactShadow(renderer, scene, {
    center: centre, width: size.x + 1.2, depth: size.z + 1.0,
  }) : null;

  // The aim point: the shot's focus on the newspaper stand, or the middle of
  // a loaded model.
  const aim = shotFocus ? shotFocus(...shot.focus) : centre;

  // Fixed framing, like the photo: `span` metres top to bottom, and never
  // less than `minWidth` metres across, so narrow phones don't crop the stand.
  function frameScene() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const d = Math.max(shot.span / 2 / tanH, shot.minWidth / 2 / (tanH * camera.aspect));
    camera.position.copy(aim).addScaledVector(viewDir, d);
    camera.lookAt(aim);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reader.state === 'idle') frameScene();
    reader.onResize();
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    reader.update(dt);
    contact?.update();
    post.render();
  });

  loading.classList.add('done');
  setTimeout(() => loading.remove(), 400);
}

// Studio softbox light, like the reference product photo: a large soft key
// from the front left, a gentle fill from the right, a rim from behind to
// lift the stand off the backdrop.
function addStudioLights(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#e6e1d8', 0.8));

  const key = new THREE.DirectionalLight('#fff8ef', 2.2);
  key.position.set(-1.8, 2.8, 3.4);
  key.castShadow = true; // self-shadowing: rungs and papers onto the board
  key.shadow.mapSize.setScalar(innerWidth < 700 ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -1, right: 1, top: 2.1, bottom: -0.2, near: 0.5, far: 10 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const fill = new THREE.DirectionalLight('#f1f4ff', 0.7);
  fill.position.set(2.4, 1.3, 2.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight('#ffffff', 0.6);
  rim.position.set(0.6, 2.6, -2.4);
  scene.add(rim);
}

// A vertical gradient, light at the top and slightly deeper at the bottom,
// like a lit paper sweep in a photo studio.
function studioBackdrop() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#f7f7f5');
  g.addColorStop(0.55, '#efeeeb');
  g.addColorStop(1, '#dfddd8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sunset through a shoji screen: a low orange sun from the right throwing
// long shadows across the room, the screen's lattice stretched over the
// wall, a dusky blue sky fill from the left.
function addSunsetLights(scene) {
  scene.add(new THREE.HemisphereLight('#b8b3c4', '#b98a62', 0.4));

  const sun = new THREE.DirectionalLight('#ffa35e', 3.2);
  sun.position.set(4.2, 1.35, 1.6);
  sun.castShadow = true;
  const small = innerWidth < 700; // phones get lighter shadow maps
  sun.shadow.mapSize.setScalar(small ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 2.6, bottom: -0.6, near: 0.5, far: 12 });
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const lattice = new THREE.SpotLight('#ffb27a', 30, 0, 0.5, 0.9, 2);
  lattice.position.set(3.6, 1.5, 1.4);
  lattice.target.position.set(-0.8, 1.35, -0.5);
  lattice.map = shojiTexture();
  lattice.castShadow = true; // three only projects a map from a shadow-casting light
  lattice.shadow.mapSize.setScalar(small ? 1024 : 2048);
  lattice.shadow.bias = -0.0004;
  lattice.shadow.normalBias = 0.025;
  scene.add(lattice, lattice.target);

  const sky = new THREE.DirectionalLight('#8fa4ff', 0.35);
  sky.position.set(-3, 2.2, 1.5);
  scene.add(sky);
}

// A shoji grid, softened, used as a light cookie. Bars let some light through.
function shojiTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 512, 512);
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = '#6a6460';
  for (let x = 40; x < 512; x += 72) ctx.fillRect(x, 0, 9, 512);
  for (let y = 30; y < 512; y += 110) ctx.fillRect(0, y, 512, 9);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

start().catch((err) => {
  console.error(err);
  loading.querySelector('p').textContent = 'The stand could not be loaded. Check the console for details.';
});
