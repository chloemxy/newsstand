// Post-processing: ambient occlusion so wires and shelves sit in their own
// soft shadows, then tone mapping, then a faint film grain and vignette for
// a printed, still-photo feel. Phones skip the occlusion to stay smooth.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const still = matchMedia('(prefers-reduced-motion: reduce)');

const Grain = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.018 }, vignette: { value: 0.25 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float vignette;
    varying vec2 vUv;
    float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb += (rand(vUv * 1024.0 + time) - 0.5) * amount;
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - dot(d, d) * vignette;
      gl_FragColor = c;
    }`,
};

export function makePost(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1.5, thickness: 1, scale: 1.1, samples: 16 });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);

  composer.addPass(new OutputPass());
  const grain = new ShaderPass(Grain);
  composer.addPass(grain);

  let frame = 0;
  return {
    setSize(w, h) {
      ao.enabled = w >= 700; // phones: skip AO
      composer.setPixelRatio(Math.min(devicePixelRatio, 2));
      composer.setSize(w, h);
    },
    render() {
      // the grain changes at 12 fps, like film; it holds still for reduced motion
      if (!still.matches && ++frame % 5 === 0) grain.uniforms.time.value = (grain.uniforms.time.value + 1.37) % 100;
      composer.render();
    },
  };
}
