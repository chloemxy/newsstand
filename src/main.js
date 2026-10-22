import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { magazines, newspapers } from './content.js';
import { loadFonts } from './textures.js';
import { Magazine, Newspaper, setAnisotropy } from './items.js';
import { buildPlaceholder } from './stands.js';
import { loadModel } from './model.js';
import { Reader } from './reader.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

async function start() {
  await loadFonts();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  setAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');

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

  if (CONFIG.defaultLights) {
    scene.add(new THREE.HemisphereLight('#ffffff', '#e4e1da', 2.2));
    const sun = new THREE.DirectionalLight('#fffaf2', 1.6);
    sun.position.set(1.8, 3.5, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -0.5, near: 0.5, far: 8 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.PointLight('#ffffff', 0.4, 6);
    fill.position.set(-2, 1.6, 1.5);
    scene.add(fill);
  }

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
    controls.minDistance = d * 0.55;
    controls.maxDistance = d * 1.25;
    controls.update();
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
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
    renderer.render(scene, camera);
  });

  loading.classList.add('done');
  setTimeout(() => loading.remove(), 400);
}

start().catch((err) => {
  console.error(err);
  loading.querySelector('p').textContent = 'The stand could not be loaded. Check the console for details.';
});
