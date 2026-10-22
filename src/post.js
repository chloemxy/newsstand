// Post-processing: tone mapping, then a light photographic grade with grain
// and vignette. Screen-space AO (GTAO) was tried twice and dropped: it banded
// on thin dowels with an orbiting camera, and with this textured backdrop it
// shaded empty background black. Contact shading comes from soft shadows.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const still = matchMedia('(prefers-reduced-motion: reduce)');

// A film look applied after tone mapping: faded blacks and warm, slightly
// creamy highlights, colour pulled back a little, then grain and vignette.
const Film = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.025 }, vignette: { value: 0.4 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float vignette;
    varying vec2 vUv;
    float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = mix(vec3(0.045, 0.04, 0.035), vec3(0.995, 0.99, 0.975), c); // a slight fade at the ends
      c = c * c * (3.0 - 2.0 * c) * 0.35 + c * 0.65;                     // gentle S-curve
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 0.92);                                          // colour pulled back a touch
      c *= vec3(1.008, 1.0, 0.99);                                         // barely warm
      c += (rand(vUv * 1024.0 + time) - 0.5) * amount;
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * vignette;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function makePost(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  composer.addPass(new OutputPass());
  const grain = new ShaderPass(Film);
  composer.addPass(grain);

  let frame = 0;
  return {
    setSize(w, h) {
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
