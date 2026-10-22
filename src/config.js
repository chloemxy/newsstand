export const CONFIG = {
  // Path to your stand model. Leave null to use the grey-box placeholder.
  // Example: './models/newsstand.glb'
  modelUrl: null,

  // If the GLB contains a camera with this name, the page starts from it.
  cameraName: 'view',

  // Placeholder only: show the magazine shelf beside the newspaper ladder.
  showMagazines: false,

  // 'studio': a seamless photo backdrop, no walls, soft softbox light.
  // 'room': the walled room with sunset light through a shoji screen.
  look: 'studio',

  // Turn off once your model carries its own (or baked) lighting.
  defaultLights: true,

  // A fixed camera, set up like the reference product photo: close, from the
  // front left and above, looking down across the lower rungs so they run
  // diagonally, with the frame cropping through the stand.
  //   azimuth: radians round from straight on (negative = from the left)
  //   elevation: radians above level
  //   focus: the point aimed at, in the newspaper stand's own space (metres)
  //   span: metres that fit top to bottom; minWidth: metres always kept across
  //   fov: lens angle; a narrow one flattens perspective like a long lens
  shot: { azimuth: -0.62, elevation: 0.6, fov: 14, focus: [0, 0.9], span: 2.05, minWidth: 1.45 },

  // In a GLB, the node to frame (e.g. an Empty parenting the stands).
  // Without it the whole model is framed.
  focusName: 'focus',

};
