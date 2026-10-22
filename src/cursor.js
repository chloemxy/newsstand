// The scene's cursor: an engraved manicule, the pointing hand old
// newspapers and catalogues printed in their margins. Fine black line art
// with hatching on a cream hand and a buttoned cuff, pointing up and to the
// left; the fingertip is the click point. Drawn as vector art and turned
// into 32 px and 64 px images (for sharp screens) at load. Over a newspaper
// the hand warms a little and lifts off the page on a soft shadow.

const INK = '#1d1a16';
const HOT = 3; // the fingertip, in cursor pixels from the top left

// the hand pointing right, in its own units; the fingertip at (62.5, 14.5)
const HAND = 'M13 11C16 9 22 8.5 27 10L58 10.5C61 10.6 62.5 12.5 62.5 14.5C62.5 16.5 61 18.2 58 18.3L36 18.6C38 19.2 39 20.6 38.6 22.2C38.2 23.8 36.8 24.6 35 24.6C36.6 25.4 37 27 36.4 28.4C35.8 29.8 34.4 30.4 32.8 30.3C33.8 31.4 33.8 33 32.8 34C31.8 35 30.4 35.1 29 34.6L20 34C17 33.6 14.8 32.6 13 31Z';
const CUFF = 'M2.5 8.5H13.5V32.5H2.5Z';
const FOLDS = 'M36 18.6C33 18.8 31 20 31.5 22M35 24.6C32.5 24.6 30.5 26 31 27.8M32.8 30.3C30.6 30.3 29 31.6 29.4 33M24 13.5C27 16.5 33 16.6 40 16.4M56.6 11.4C59.6 11.6 60.6 12.8 60.6 14.4';
const HATCH = Array.from({ length: 9 }, (_, i) => `M${16 + i * 2.2} 30.5l3 -4`).join('') + 'M41 17.6h14M41 17.1h12';

function svg(over) {
  const paper = over ? '#fff8e6' : '#f6f2e9';
  const shadow = over
    ? `<g transform="translate(4.4 4.8) rotate(-135) scale(.5) translate(-62.5 -14.5)" opacity=".22"><path d="${CUFF}" fill="#2a2216"/><path d="${HAND}" fill="#2a2216"/></g>`
    : `<g transform="translate(3.9 4.1) rotate(-135) scale(.5) translate(-62.5 -14.5)" opacity=".16"><path d="${CUFF}" fill="#2a2216"/><path d="${HAND}" fill="#2a2216"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".7"/></filter></defs>
<g filter="url(#soft)">${shadow}</g>
<g transform="translate(${HOT} ${HOT}) rotate(-135) scale(.5) translate(-62.5 -14.5)">
<path d="${CUFF}" fill="${paper}" stroke="${INK}" stroke-width="1.3"/>
<path d="M6 8.5V32.5M10 8.5V32.5" stroke="${INK}" stroke-width=".7"/>
<circle cx="8" cy="14" r="1" fill="${INK}"/><circle cx="8" cy="26" r="1" fill="${INK}"/>
<path d="${HAND}" fill="${paper}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="${FOLDS}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>
<path d="${HATCH}" stroke="${INK}" stroke-width=".6" stroke-linecap="round"/>
</g></svg>`;
}

// the vector art as a PNG of the given size
function raster(source, px) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      c.getContext('2d').drawImage(img, 0, 0, px, px);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  });
}

export async function makeHandCursor() {
  try {
    const shots = {};
    for (const name of ['rest', 'over']) {
      const s = svg(name === 'over');
      shots[name] = { x1: await raster(s, 32), x2: await raster(s, 64) };
    }
    const rule = (s, fallback) =>
      `cursor: url("${s.x1}") ${HOT} ${HOT}, ${fallback}; cursor: -webkit-image-set(url("${s.x1}") 1x, url("${s.x2}") 2x) ${HOT} ${HOT}, ${fallback}; cursor: image-set(url("${s.x1}") 1x, url("${s.x2}") 2x) ${HOT} ${HOT}, ${fallback};`;
    const style = document.createElement('style');
    style.textContent = `#scene { ${rule(shots.rest, 'default')} } #scene.over { ${rule(shots.over, 'pointer')} }`;
    document.head.append(style);
    return await raster(svg(false), 256); // a large copy, handy for checking it
  } catch (err) {
    console.warn('Hand cursor unavailable, keeping the default.', err);
    return null;
  }
}
