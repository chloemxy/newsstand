export const CONFIG = {
  // Path to your stand model. Leave null to use the grey-box placeholder.
  // Example: './models/newsstand.glb'
  modelUrl: null,

  // If the GLB contains a camera with this name, the page starts from it.
  cameraName: 'view',

  // Turn off once your model carries its own (or baked) lighting.
  defaultLights: true,

  // Where the camera looks and how far people may orbit.
  target: [-0.42, 0.92, 0],
  camera: [-0.42, 1.15, 2.7],
  // the area that should fit on screen at the start, in metres
  sceneWidth: 2.9,
  sceneHeight: 2.4,
  orbit: { minAzimuth: -0.6, maxAzimuth: 0.6, minPolar: 1.05, maxPolar: 1.62, minDistance: 1.4, maxDistance: 3.4 },
};
