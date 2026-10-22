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
  controls.minDistance = o.minDistance; controls.maxDistance = o.maxDistance;

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

  let slots;
  if (CONFIG.modelUrl) {
    const model = await loadModel(CONFIG.modelUrl, scene, CONFIG.cameraName);
    slots = model.slots;
    if (model.camera) {
      model.camera.updateWorldMatrix(true, false);
      model.camera.getWorldPosition(camera.position);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(model.camera.getWorldQuaternion(new THREE.Quaternion()));
      controls.target.copy(camera.position).addScaledVector(fwd, 2.5);
      if (model.camera.isPerspectiveCamera) camera.fov = model.camera.fov;
    }
  } else {
    slots = buildPlaceholder(scene);
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

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // back the camera off until the whole set fits the width
    if (controls.enabled) {
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      // portrait screens frame one stand and let people drag to the other
      const width = camera.aspect < 1 ? CONFIG.sceneWidth * 0.62 : CONFIG.sceneWidth;
      const fit = Math.max(width / 2 / (tanH * camera.aspect), CONFIG.sceneHeight / 2 / tanH * (camera.aspect < 1 ? 0 : 1));
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.maxDistance = Math.max(CONFIG.orbit.maxDistance, fit * 1.1);
      camera.position.copy(controls.target).addScaledVector(dir, fit);
    }
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
