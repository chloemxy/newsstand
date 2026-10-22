import * as THREE from 'three';
import { CONFIG } from './config.js';
import { magazines, newspapers } from './content.js';
import { loadFonts, loadPrint } from './textures.js';
import { Magazine, Newspaper, setAnisotropy } from './items.js';
import { buildPlaceholder } from './stands.js';
import { loadModel } from './model.js';
import { Reader } from './reader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { setMaterialAnisotropy, loadScans } from './materials.js';
import { makePost } from './post.js';
import { ContactShadow } from './contact-shadow.js';
import { zenBackdrop, leafCanopy } from './backdrop.js';
import { makeHandCursor } from './cursor.js';
import { FallingLeaves } from './leaves.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

const studio = CONFIG.look === 'studio';

async function start() {
  await Promise.all([loadFonts(), loadPrint()]);
  const cursorRender = makeHandCursor(); // the engraved hand cursor (a promise)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCF honours shadow.radius for soft edges; VSM bled light at grazing angles
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  setAnisotropy(renderer.capabilities.getMaxAnisotropy());
  setMaterialAnisotropy(renderer.capabilities.getMaxAnisotropy());
  await loadScans();

  const scene = new THREE.Scene();
  // studio: a calm limewash wall with a bamboo shadow drifting across it
  const backdrop = studio ? zenBackdrop() : null;
  scene.background = backdrop ? backdrop.texture : new THREE.Color('#ead5bd');
  // a soft room for the oiled wood to catch highlights from
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = studio ? 0.22 : 0.22;

  const shot = CONFIG.shot;
  const camera = new THREE.PerspectiveCamera(shot.fov, 1, 0.02, 80);
  scene.add(camera); // the held item and the dimmer ride along with it

  // The view is fixed, so there are no orbit controls; the reader only
  // needs to know whether the camera is free (it never moves anyway).
  const controls = { enabled: true };

  const lights = CONFIG.defaultLights ? (studio ? addStudioLights : addSunsetLights)(scene) : null;

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
    if (item.rod) slot.add(item.rod); // the rod rests on the stand between pick-ups
    items.push(item);
  });
  if (CONFIG.modelUrl || CONFIG.showMagazines) place(magazines, slots.magazines, Magazine);
  place(newspapers, slots.newspapers, Newspaper);

  focus.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(focus);
  const reader = new Reader({ camera, controls, canvas, items, bounds });
  const leaves = new FallingLeaves(scene, bounds); // now and then, a leaf drifts down
  const post = makePost(renderer, scene, camera);
  window.kiosk = { cursorRender, leaves, scene, camera, controls, reader, items, post }; // handy in the devtools console

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
    // on tall screens the view is taller than `span`: keep the bottom of the
    // frame where it was (the base stays out of shot) and let the extra
    // height show backdrop above the stand
    const extra = Math.max(0, 2 * d * tanH - shot.span) / 2;
    const target = aim.clone().add(new THREE.Vector3(0, extra, 0));
    camera.position.copy(target).addScaledVector(viewDir, d);
    camera.lookAt(target);
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
    backdrop?.update(clock.elapsedTime);
    lights?.update?.(clock.elapsedTime);
    leaves.update(dt);
    post.render();
  });

  loading.classList.add('done');
  setTimeout(() => loading.remove(), 400);
}

// Calm daylight, like the reference product photo: a large soft key from
// the front right, a gentle fill on the camera side, a rim from behind to
// lift the stand off the backdrop.
function addStudioLights(scene) {
  // warm tungsten studio: a big soft key, warm bounce from below, a cooler
  // window fill, and a rim to separate the stand from the backdrop
  scene.add(new THREE.HemisphereLight('#f4f1ec', '#d6d2c9', 0.2));

  // the key is warm sunlight through leaves, from high front-right, across
  // from the camera (which looks from the left), so shadows fall visibly
  // below and beside each rod and paper. An unseen leaf canopy in front of
  // it dapples everything it lights.
  const key = new THREE.DirectionalLight('#ffdcb0', 3.8);
  const sunDir = new THREE.Vector3(2.2, 3.4, 2.2).normalize();
  key.position.copy(sunDir).multiplyScalar(4.6);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(innerWidth < 700 ? 2048 : 4096);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.1, bottom: -0.2, near: 0.5, far: 10 });
  key.shadow.radius = 5;
  key.shadow.blurSamples = 20;
  // no normal bias: the paper sheets are double-sided and their normals
  // face into the fold, so a normal offset would push the shadow test
  // behind the paper and leave every page in its own shadow
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0;
  scene.add(key);

  // the canopy hangs between the sun and the stand, facing the sun
  const leaves = leafCanopy();
  leaves.mesh.position.set(0, 1.1, 0).addScaledVector(sunDir, 1.6);
  leaves.mesh.lookAt(leaves.mesh.position.clone().add(sunDir));
  leaves.settle();
  scene.add(leaves.mesh);

  const fill = new THREE.DirectionalLight('#e6ecf6', 0.45);
  fill.position.set(-2.6, 1.4, 2.4); // camera side, keeps the shadows from going black
  scene.add(fill);

  const rim = new THREE.DirectionalLight('#fff0dc', 0.6);
  rim.position.set(0.6, 2.6, -2.4);
  scene.add(rim);
  return leaves; // update(seconds) sways the leaves
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
