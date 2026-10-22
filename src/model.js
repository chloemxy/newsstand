// Loads your stand model and finds the slots the magazines and newspapers
// sit in. See models/README.md for the naming rules.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { collectSlots } from './stands.js';

export async function loadModel(url, scene, cameraName) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    // a slot modelled as a mesh (e.g. a plane) is only a marker: hide it, keep its children
    if (/^slot_(magazine|newspaper)/i.test(o.name)) o.material = new THREE.MeshBasicMaterial({ visible: false });
  });
  scene.add(root);
  const camera = gltf.cameras.find((c) => c.name === cameraName) || null;
  return { slots: collectSlots(root), camera };
}
