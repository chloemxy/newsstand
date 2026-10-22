// Paints covers and pages onto canvases. These become textures on the
// placeholder magazines and newspapers. Swap a page for { image } in
// content.js to use your own artwork instead.

export const PAPER = '#f4efe4';
export const NEWSPRINT = '#ece6d6';
const INK = '#1d1a16';

const F = {
  display: '"Fraunces", Georgia, serif',
  news: '"Old Standard TT", "Times New Roman", serif',
  ui: '"Reform Grotesk", "Archivo", "Helvetica Neue", Arial, sans-serif',
};

export async function loadFonts() {
  const faces = [
    `900 80px ${F.display}`, `700 40px ${F.display}`, `italic 600 40px ${F.display}`,
    `400 24px ${F.news}`, `700 24px ${F.news}`, `400 20px ${F.ui}`, `600 20px ${F.ui}`,
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

// Newspaper page, full sheet 786 × 1200 (the folded half is the top 600).
export function paintNewsPage(paper, page, index, img) {
  const [c, ctx] = canvas(786, 1200);
  ctx.fillStyle = NEWSPRINT; ctx.fillRect(0, 0, 786, 1200);
  if (img) { drawCover(ctx, img, 786, 1200); return c; }
  ctx.fillStyle = INK; ctx.textAlign = 'center';
  let y;
  if (index === 0) {
    const mast = paper.title.toUpperCase();
    fitFont(ctx, mast, `700 {s}px ${F.news}`, 720, 92);
    ctx.fillText(mast, 393, 128);
    ctx.fillRect(32, 152, 722, 3); ctx.fillRect(32, 196, 722, 1);
    ctx.font = `400 18px ${F.news}`; ctx.fillText(paper.date, 393, 182);
    y = 272;
  } else {
    ctx.font = `700 22px ${F.news}`; ctx.fillText(`${paper.title}  ·  ${page.kicker}`, 393, 64);
    ctx.fillRect(32, 84, 722, 2);
    y = 160;
  }
  ctx.textAlign = 'left';
  ctx.font = `700 ${index === 0 ? 56 : 48}px ${F.news}`;
  y = wrap(ctx, page.headline, 32, y, 722, index === 0 ? 64 : 56, 3);
  photoBlock(ctx, 32, y, 722, 360, '#3a352d');
  y += 400;
  // three columns: real copy in the first, column rules for the rest
  const colW = 224, gap = 24;
  ctx.font = `400 20px ${F.news}`; ctx.fillStyle = INK;
  wrap(ctx, page.body, 32, y + 8, colW, 28, 20);
  ctx.globalAlpha = 0.22;
  for (let col = 1; col < 3; col++) {
    const x = 32 + col * (colW + gap);
    for (let ly = y; ly < 1160; ly += 28) ctx.fillRect(x, ly, colW - ((ly / 28) % 7 === 0 ? 72 : 0), 10);
  }
  ctx.globalAlpha = 1;
  return c;
}


export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = reject; img.src = url;
  });
}
