export const CONFIG = {
  // Path to your stand model. Leave null to use the grey-box placeholder.
  // Example: './models/newsstand.glb'
  modelUrl: null,

  // If the GLB contains a camera with this name, the page starts from it.
  cameraName: 'view',

  // Turn off once your model carries its own (or baked) lighting.
  defaultLights: true,

  // The camera looks from `camera` toward `target`; only the direction
  // matters, the distance is fitted to the screen so the stands are centred.
  target: [0, 0.9, 0],
  camera: [0, 1.15, 2.7],

  // In a GLB, the node to frame (e.g. an Empty parenting the stands).
  // Without it the whole model is framed.
  focusName: 'focus',

  // how far a click-and-drag can swing the view (radians)
  orbit: { minAzimuth: -0.9, maxAzimuth: 0.9, minPolar: 0.95, maxPolar: 1.62 },
};
