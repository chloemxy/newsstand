// Paints covers and pages onto canvases. These become textures on the
// placeholder magazines and newspapers. Swap a page for { image } in
// content.js to use your own artwork instead.

export const PAPER = '#f4efe4';
export const NEWSPRINT = '#e8dcc1'; // yellowed
const INK = '#1d1a16';

const F = {
  display: '"Fraunces", Georgia, serif',
  news: '"Old Standard TT", "Times New Roman", serif',
  ui: '"Reform Grotesk", "Archivo", "Helvetica Neue", Arial, sans-serif',
};

export async function loadFonts() {
  const faces = [
    `900 80px ${F.display}`, `700 40px ${F.display}`, `italic 600 40px ${F.display}`,
    `400 24px ${F.news}`, `700 24px ${F.news}`, `italic 400 24px ${F.news}`, `400 20px ${F.ui}`, `600 20px ${F.ui}`, `800 20px ${F.ui}`,
  ];
  try { await Promise.all(faces.map((f) => document.fonts.load(f))); } catch { /* fall back to system fonts */ }
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Wraps text into maxW and returns the y after the last line.
function wrap(ctx, text, x, y, maxW, lineH, maxLines = 99) {
  const words = String(text).split(/\s+/);
  let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = words[i];
      if (++lines >= maxLines) return y;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}

function fitFont(ctx, text, weightFamily, maxW, start) {
  let size = start;
  do { ctx.font = `${weightFamily.replace('{s}', size)}`; size -= 4; } while (ctx.measureText(text).width > maxW && size > 16);
}

function drawCover(ctx, img, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

function photoBlock(ctx, x, y, w, h, tint) {
  ctx.fillStyle = tint; ctx.globalAlpha = 0.18; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  ctx.strokeStyle = tint; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.38, y + h * 0.45); ctx.lineTo(x + w * 0.6, y + h * 0.7);
  ctx.lineTo(x + w * 0.78, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = `600 18px ${F.ui}`; ctx.fillStyle = INK; ctx.globalAlpha = 0.5;
  ctx.fillText('Photo', x + 16, y + 32); ctx.globalAlpha = 1;
}

// Magazine cover, 768 × 1024 (3:4).
export function paintCover(mag, img) {
  const [c, ctx] = canvas(768, 1024);
  const { bg, ink, line } = mag.cover;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 768, 1024);
  if (img) drawCover(ctx, img, 768, 1024);
  else {
    ctx.fillStyle = ink; ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(520, 620, 300, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(260, 760, 120, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
  fitFont(ctx, mag.title, `900 {s}px ${F.display}`, 704, 200);
  ctx.fillText(mag.title, 32, 200);
  ctx.font = `600 22px ${F.ui}`; ctx.fillText(mag.issue.toUpperCase(), 36, 248);
  ctx.font = `italic 600 64px ${F.display}`;
  wrap(ctx, line, 36, 840, 600, 72, 2);
  // barcode
  ctx.fillStyle = '#fff'; ctx.fillRect(608, 912, 128, 80);
  ctx.fillStyle = '#111';
  for (let i = 0, x = 616; x < 728; i++) { const bw = 1 + ((i * 7 + mag.id.length) % 3); ctx.fillRect(x, 920, bw, 56); x += bw + 2; }
  return c;
}

// Magazine inside page, 768 × 1024.
export function paintMagPage(page, number, mag, img) {
  const [c, ctx] = canvas(768, 1024);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 768, 1024);
  if (img) { drawCover(ctx, img, 768, 1024); return c; }
  if (!page) return c;
  const accent = mag.cover.bg === '#e9e4da' ? INK : mag.cover.bg;
  ctx.fillStyle = INK; ctx.globalAlpha = 0.55; ctx.font = `600 16px ${F.ui}`;
  ctx.fillText(mag.title.toUpperCase(), 64, 64); ctx.globalAlpha = 1;
  ctx.fillStyle = accent; ctx.font = `600 20px ${F.ui}`;
  ctx.fillText(page.kicker.toUpperCase(), 64, 136);
  ctx.fillStyle = INK; ctx.font = `700 56px ${F.display}`;
  let y = wrap(ctx, page.headline, 64, 208, 640, 64, 3);
  photoBlock(ctx, 64, y + 8, 640, 360, accent);
  ctx.font = `400 26px ${F.news}`; ctx.fillStyle = INK;
  wrap(ctx, page.body, 64, y + 432, 640, 40, 6);
  ctx.font = `600 16px ${F.ui}`; ctx.globalAlpha = 0.55;
  ctx.fillText(String(number), number % 2 ? 688 : 64, 976); ctx.globalAlpha = 1;
  return c;
}

// ---- Newspapers: tabloid pages, 780 × 1020 (29 × 38 cm), after the
// reference photo: a stacked serif masthead, rules and a date line, then a
// front page in one of three styles, with real-looking columns of type.

const NEWS_W = 780, NEWS_H = 1020, M = 36;
const INK_NEWS = '#231e19'; // warm, slightly faded black, like old newsprint ink

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// A grainy black-and-white "photograph": soft shapes, light from one side.
function drawPhoto(ctx, x, y, w, h, seed) {
  const r = seeded(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  const base = 90 + r() * 70;
  g.addColorStop(0, `rgb(${base + 60},${base + 60},${base + 58})`);
  g.addColorStop(1, `rgb(${base - 40},${base - 40},${base - 42})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.filter = 'blur(5px)';
  for (let i = 0; i < 14; i++) {
    const v = Math.floor(20 + r() * 200);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    const bx = x + r() * w, by = y + h * (0.3 + r() * 0.8), bw = 30 + r() * w * 0.35, bh = 30 + r() * h * 0.6;
    if (r() < 0.5) ctx.fillRect(bx - bw / 2, by - bh, bw, bh);
    else { ctx.beginPath(); ctx.ellipse(bx, by - bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.filter = 'none';
  // print grain
  const img = ctx.getImageData(x, y, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 38;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, x, y);
  ctx.restore();
}

// A flat colour illustration: crossed fork and knife, or a bar chart.
function drawIllustration(ctx, x, y, w, h, colour, seed) {
  ctx.save();
  ctx.fillStyle = colour; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  const cx = x + w / 2, cy = y + h / 2, u = Math.min(w, h);
  if (seed % 2 === 0) {
    ctx.lineWidth = u * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - u * 0.18, cy - u * 0.28); ctx.lineTo(cx + u * 0.18, cy + u * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + u * 0.18, cy - u * 0.28); ctx.lineTo(cx - u * 0.18, cy + u * 0.28); ctx.stroke();
    for (const d of [-1, 0, 1]) {
      ctx.beginPath(); ctx.moveTo(cx - u * 0.18 + d * u * 0.03, cy - u * 0.36); ctx.lineTo(cx - u * 0.18 + d * u * 0.03, cy - u * 0.26); ctx.stroke();
    }
    ctx.fillRect(x + w * 0.08, y + h * 0.12, w * 0.22, h * 0.08);
  } else {
    for (let i = 0; i < 5; i++) {
      const bh = h * (0.2 + 0.12 * ((i * 7 + seed) % 5));
      ctx.fillRect(x + w * 0.12 + i * w * 0.16, y + h * 0.85 - bh, w * 0.1, bh);
    }
    ctx.fillRect(x + w * 0.08, y + h * 0.86, w * 0.84, 4);
  }
  ctx.restore();
}

// Columns of small type, filled with the paper's own copy.
function columns(ctx, copy, x, y, w, h, cols, size = 15) {
  const gap = 16, cw = (w - gap * (cols - 1)) / cols, lh = Math.round(size * 1.28);
  ctx.font = `400 ${size}px ${F.news}`;
  const words = copy.split(/\s+/);
  let wi = 0;
  for (let c = 0; c < cols; c++) {
    const cx = x + c * (cw + gap);
    ctx.fillStyle = '#2e2822';
    for (let ly = y + size; ly <= y + h; ly += lh) {
      let line = '';
      for (;;) {
        const next = words[wi % words.length];
        const test = line ? `${line} ${next}` : next;
        if (ctx.measureText(test).width > cw && line) break;
        line = test; wi++;
      }
      ctx.fillText(line, cx, ly);
    }
    if (c < cols - 1) { ctx.fillStyle = '#b8b1a5'; ctx.fillRect(cx + cw + gap / 2, y, 1, h); }
  }
}

function masthead(ctx, paper) {
  const hasThe = /^The\s+/i.test(paper.title);
  const words = paper.title.replace(/^The\s+/i, '').toUpperCase().split(/\s+/);
  ctx.fillStyle = INK_NEWS;
  if (hasThe) { ctx.font = `italic 400 22px ${F.news}`; ctx.fillText('The', M, M + 18); }
  ctx.font = `700 58px ${F.news}`;
  const half = Math.ceil(words.length / 2);
  const lines = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : words;
  let y = M + (hasThe ? 70 : 52);
  for (const l of lines) { ctx.fillText(l, M, y); y += 54; }
  ctx.font = `600 13px ${F.ui}`;
  ctx.textAlign = 'right';
  ctx.fillText('NEWS · LETTERS · LISTINGS', NEWS_W - M, M + 18);
  ctx.fillText('£1.20', NEWS_W - M, M + 38);
  ctx.textAlign = 'left';
  y -= 28;
  ctx.fillRect(M, y, NEWS_W - 2 * M, 3);
  ctx.font = `400 14px ${F.news}`;
  ctx.fillText(paper.date.toUpperCase(), M, y + 22);
  ctx.fillRect(M, y + 32, NEWS_W - 2 * M, 1);
  return y + 52;
}

// Real print: CC0 photographs printed as halftone, and a scanned paper grain
// over every page (see assets/tex/CREDITS.md). Loaded before painting.
export const PHOTO_FILES = [
  'abandoned_bakery', 'abandoned_slipway', 'art_studio', 'bell_tower',
  'billiard_hall', 'binnenalster', 'cambridge', 'carpentry_shop_01',
];
const PRINT = { grain: null, photos: new Map() };

export async function loadPrint() {
  const jobs = [['grain', 'assets/tex/paper_grain.jpg'], ...PHOTO_FILES.map((n) => [n, `assets/photos/${n}.jpg`])];
  await Promise.all(jobs.map(async ([k, url]) => {
    try {
      const img = await loadImage(url);
      if (k === 'grain') PRINT.grain = img; else PRINT.photos.set(k, img);
    } catch { /* fall back to the drawn photo and plain paper */ }
  }));
}

// The paper's own photo on its front page; inner pages borrow one by seed.
function photoFor(paper, index, seed) {
  if (index === 0 && paper.photo && PRINT.photos.has(paper.photo)) return PRINT.photos.get(paper.photo);
  const list = [...PRINT.photos.values()];
  return list.length ? list[seed % list.length] : null;
}

// Prints a photo as a newspaper halftone: a 45° screen of ink dots whose
// size follows the darkness of the picture.
function halftone(ctx, img, x, y, w, h, cell = 4.5) {
  const src = document.createElement('canvas');
  src.width = Math.ceil(w); src.height = Math.ceil(h);
  const sx = src.getContext('2d', { willReadFrequently: true });
  const r = Math.max(w / img.width, h / img.height);
  sx.drawImage(img, (w - img.width * r) / 2, (h - img.height * r) / 2, img.width * r, img.height * r);
  const data = sx.getImageData(0, 0, src.width, src.height).data;
  const lum = (px, py) => {
    const i = (Math.min(src.height - 1, Math.max(0, py | 0)) * src.width + Math.min(src.width - 1, Math.max(0, px | 0))) * 4;
    return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  };
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = INK_NEWS;
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, c = Math.SQRT1_2;
  for (let v = -R; v <= R; v += cell) {
    for (let u = -R; u <= R; u += cell) {
      const px = cx + (u - v) * c, py = cy + (u + v) * c; // rotate the screen 45°
      if (px < -cell || py < -cell || px > w + cell || py > h + cell) continue;
      let d = 1 - lum(px, py);
      d = Math.min(1, Math.max(0, (d - 0.16) * 1.3)); // lighter, with a little more contrast
      if (d < 0.03) continue;
      ctx.beginPath(); ctx.arc(x + px, y + py, cell * 0.64 * Math.sqrt(d), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function printPhoto(ctx, paper, index, seed, x, y, w, h) {
  const img = photoFor(paper, index, seed);
  if (img) halftone(ctx, img, x, y, w, h); else drawPhoto(ctx, x, y, w, h, seed);
}

// Old paper: yellowing that deepens toward the edges, foxing spots, and
// the scanned paper grain.
function age(ctx, seed) {
  const r = seeded(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(NEWS_W / 2, NEWS_H / 2, NEWS_W * 0.3, NEWS_W / 2, NEWS_H / 2, NEWS_H * 0.72);
  g.addColorStop(0, 'rgba(175,135,70,0)');
  g.addColorStop(1, 'rgba(160,115,50,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, NEWS_W, NEWS_H);
  for (let i = 0; i < 34; i++) {
    const x = r() * NEWS_W, y = r() * NEWS_H, rad = 2 + r() * r() * 16;
    ctx.fillStyle = `rgba(150,108,55,${0.07 + r() * 0.13})`;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  // the scanned recycled-paper grain, a different crop on every page
  if (PRINT.grain) {
    ctx.globalAlpha = 0.7;
    const g = PRINT.grain, ox = -r() * g.width * 0.3, oy = -r() * g.height * 0.3;
    ctx.drawImage(g, ox, oy, NEWS_W * 1.35, NEWS_H * 1.35);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

const allCopy = (paper) => paper.pages.map((p) => `${p.headline}. ${p.body}`).join(' ');

// Wraps condensed bold caps at the largest size that fits `maxH`.
function poster(ctx, text, x, y, w, maxH) {
  ctx.fillStyle = INK_NEWS;
  ctx.fontStretch = 'condensed';
  let size = 140, lines;
  do {
    ctx.font = `800 ${size}px ${F.ui}`;
    lines = []; let line = '';
    for (const wd of text.toUpperCase().split(' ')) {
      const t = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(t).width > w && line) { lines.push(line); line = wd; } else line = t;
    }
    lines.push(line);
    size -= 4;
  } while (lines.length * size * 0.95 > maxH && size > 40);
  const lh = (size + 4) * 0.95;
  for (const l of lines) { y += lh; ctx.fillText(l, x, y); }
  ctx.fontStretch = 'normal';
  return y;
}

export function paintNewsPage(paper, page, index, img) {
  const [c, ctx] = canvas(NEWS_W, NEWS_H);
  ctx.fillStyle = NEWSPRINT; ctx.fillRect(0, 0, NEWS_W, NEWS_H);
  if (img) { drawCover(ctx, img, NEWS_W, NEWS_H); return c; }
  const seed = hash(paper.id) + index * 101;
  const copy = allCopy(paper);
  const W = NEWS_W - 2 * M;
  let y;

  if (index > 0) {
    ctx.fillStyle = INK_NEWS; ctx.font = `700 18px ${F.news}`;
    ctx.fillText(paper.title.toUpperCase(), M, M + 14);
    ctx.textAlign = 'right'; ctx.fillText(page.kicker.toUpperCase(), NEWS_W - M, M + 14); ctx.textAlign = 'left';
    ctx.fillRect(M, M + 26, W, 2);
    ctx.font = `700 46px ${F.news}`;
    y = wrap(ctx, page.headline, M, M + 90, W, 50, 3);
    printPhoto(ctx, paper, index, seed, M, y, W, 330);
    columns(ctx, `${page.body} ${copy}`, M, y + 350, W, NEWS_H - M - (y + 350), 3);
    age(ctx, seed);
    return c;
  }

  y = masthead(ctx, paper);
  const style = paper.style || 'photo';
  if (style === 'quote') {
    y = poster(ctx, page.headline, M, y, W, NEWS_H * 0.6);
    columns(ctx, copy, M, y + 26, W, NEWS_H - M - (y + 26), 3, 14);
  } else if (style === 'illustration') {
    const colW = W * 0.34;
    columns(ctx, copy, M, y + 4, colW, 330, 1, 14);
    drawIllustration(ctx, M + colW + 18, y + 4, W - colW - 18, 330, paper.accent || '#3f9a4a', seed);
    ctx.fillStyle = INK_NEWS; ctx.fontStretch = 'condensed'; ctx.font = `800 54px ${F.ui}`;
    y = wrap(ctx, page.headline, M, y + 404, W, 56, 2);
    ctx.fontStretch = 'normal';
    columns(ctx, copy, M, y + 6, W, NEWS_H - M - (y + 6), 3, 14);
  } else {
    ctx.fillStyle = INK_NEWS; ctx.font = `700 46px ${F.news}`;
    y = wrap(ctx, page.headline, M, y + 44, W, 50, 3);
    printPhoto(ctx, paper, index, seed, M, y, W, 360);
    ctx.font = `italic 400 13px ${F.news}`; ctx.fillStyle = '#4a4640';
    ctx.fillText(`${page.body.split('.')[0]}.`, M, y + 380);
    columns(ctx, copy, M, y + 396, W, NEWS_H - M - (y + 396), 3, 14);
  }
  age(ctx, seed);
  return c;
}

// The back page: listings in columns and a boxed advertisement.
export function paintNewsBack(paper) {
  const [c, ctx] = canvas(NEWS_W, NEWS_H);
  ctx.fillStyle = NEWSPRINT; ctx.fillRect(0, 0, NEWS_W, NEWS_H);
  ctx.fillStyle = INK_NEWS; ctx.font = `700 18px ${F.news}`;
  ctx.fillText(paper.title.toUpperCase(), M, M + 14);
  ctx.fillRect(M, M + 26, NEWS_W - 2 * M, 2);
  columns(ctx, allCopy(paper), M, M + 44, NEWS_W - 2 * M, 560, 4, 13);
  ctx.strokeStyle = INK_NEWS; ctx.lineWidth = 3;
  ctx.strokeRect(M, 660, NEWS_W - 2 * M, NEWS_H - M - 660);
  ctx.fillStyle = INK_NEWS; ctx.font = `700 40px ${F.news}`; ctx.textAlign = 'center';
  ctx.fillText('CLASSIFIEDS', NEWS_W / 2, 730);
  ctx.textAlign = 'left';
  columns(ctx, allCopy(paper), M + 20, 760, NEWS_W - 2 * M - 40, NEWS_H - M - 790, 3, 13);
  age(ctx, hash(paper.id) + 7);
  return c;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = reject; img.src = url;
  });
}

