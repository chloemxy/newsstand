import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

async function start() {
  await loadFonts();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  setAnisotropy(renderer.capabilities.getMaxAnisotropy());
  setMaterialAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#efe9de');
  // a soft room for the oiled wood to catch highlights from
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 50);
  camera.position.fromArray(CONFIG.camera);
  scene.add(camera); // the held item and the dimmer ride along with it

  const controls = new OrbitControls(camera, canvas);
  controls.target.fromArray(CONFIG.target);
  controls.enableDamping = true;
  controls.enablePan = false;
  const o = CONFIG.orbit;
  controls.minAzimuthAngle = o.minAzimuth; controls.maxAzimuthAngle = o.maxAzimuth;
  controls.minPolarAngle = o.minPolar; controls.maxPolarAngle = o.maxPolar;

  if (CONFIG.defaultLights) addLights(scene);

  // the direction the camera looks from; the distance is worked out to fit
  const viewDir = new THREE.Vector3().fromArray(CONFIG.camera).sub(controls.target).normalize();

  let slots, focus;
  if (CONFIG.modelUrl) {
    const model = await loadModel(CONFIG.modelUrl, scene, CONFIG.cameraName, CONFIG.focusName);
    ({ slots, focus } = model);
    if (model.camera) {
      model.camera.updateWorldMatrix(true, false);
      viewDir.set(0, 0, 1).applyQuaternion(model.camera.getWorldQuaternion(new THREE.Quaternion()));
      if (model.camera.isPerspectiveCamera) camera.fov = model.camera.fov;
    }
  } else {
    ({ slots, focus } = buildPlaceholder(scene));
  }

  const items = [];
  const place = (list, slotList, Make) => list.forEach((data, i) => {
    const slot = slotList[i];
    if (!slot) { console.warn(`No slot for "${data.title}". Add more slots to the model.`); return; }
    const item = new Make(data);
    item.slot = slot;
    item.root.position.copy(item.mount);
    slot.add(item.root);
    items.push(item);
  });
  place(magazines, slots.magazines, Magazine);
  place(newspapers, slots.newspapers, Newspaper);

  const reader = new Reader({ camera, controls, canvas, items });
  const post = makePost(renderer, scene, camera);
  window.kiosk = { scene, camera, controls, reader, items }; // handy in the devtools console

  // Frame the stands, centred in the space between the top bar and the
  // text at the bottom, on any screen size.
  focus.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(focus);
  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  function frameScene() {
    const vw = innerWidth, vh = innerHeight;
    const gutter = vw < 600 ? 16 : 32;
    const top = document.querySelector('.bar').getBoundingClientRect().bottom + gutter;
    const bottom = Math.min(...['.intro', '.index'].map((q) => document.querySelector(q).getBoundingClientRect().top)) - gutter;
    const availW = (vw - 2 * gutter) / vw;
    const availH = Math.max(0.35, (bottom - top) / vh);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const d = Math.max(size.x / 2 / (tanH * camera.aspect * availW), size.y / 2 / (tanH * availH)) + size.z / 2;
    // move the aim down so the stands sit in the middle of the free space
    const lift = (vh / 2 - (top + bottom) / 2) / vh * 2 * d * tanH;
    controls.target.copy(centre).add(new THREE.Vector3(0, -lift, 0));
    camera.position.copy(controls.target).addScaledVector(viewDir, d);
    controls.minDistance = d * 0.45;
    controls.maxDistance = d * 1.3;
    controls.update();
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
    if (controls.enabled) controls.update();
    reader.update(dt);
    post.render();
  });

  loading.classList.add('done');
  setTimeout(() => loading.remove(), 400);
}

// Late afternoon light through a shoji screen: a low warm sun from the right,
// a spotlight carrying the screen's lattice onto the wall, a cool fill.
function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#fff8ee', '#d6cdbf', 0.4));

  const sun = new THREE.DirectionalLight('#ffe8cc', 2.1);
  sun.position.set(2.6, 2.7, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 2.4, bottom: -0.4, near: 0.5, far: 9 });
  sun.shadow.radius = 10;
  sun.shadow.blurSamples = 24;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.01;
  scene.add(sun);

  const lattice = new THREE.SpotLight('#ffe2bf', 20, 0, 0.62, 0.85, 2);
  lattice.position.set(2.4, 2.5, 1.7);
  lattice.target.position.set(-0.4, 1.2, -0.5);
  lattice.map = shojiTexture();
  lattice.castShadow = true; // three only projects a map from a shadow-casting light
  lattice.shadow.mapSize.set(1024, 1024);
  lattice.shadow.radius = 8;
  lattice.shadow.blurSamples = 16;
  lattice.shadow.bias = -0.0003;
  scene.add(lattice, lattice.target);

  const fill = new THREE.DirectionalLight('#e3ebff', 0.35);
  fill.position.set(-2.5, 1.6, 1.5);
  scene.add(fill);
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
