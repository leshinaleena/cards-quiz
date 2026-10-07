// Открытка «Ваш Лос-Анджелес» 1080×1350 — рисуется в браузере, без сервера.
// Два стиля текста: заголовки Montserrat 800, текст Inter. Крупно, чтобы читалось в превью мессенджера.
const W = 1080, H = 1350, X = 72, MW = W - 144;
const WINE = '#69131D', CREAM = '#F2EAE3', INK = '#2B1B1E';
const HEAD = (px) => `800 ${px}px Montserrat, Arial, sans-serif`;
const TEXT = (px, w = 400) => `${w} ${px}px Inter, Arial, sans-serif`;

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function wrap(ctx, text, maxW) {
  // короткие предлоги и союзы не остаются в конце строки
  const words = text.replace(/(^|\s)(в|во|с|со|к|о|у|и|а|на|по|до|за|от|из|для)\s/gi, '$1$2\u00A0').split(' '); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function plate(ctx, x, y, w, h, r) { // фирменная плашка: скругление по диагонали
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - 8, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 8);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + 8, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export async function drawGift({ logoSvg, title, who, routeTitle, route, rider, total, seasonTitle, season, gift, giftNote, contacts }) {
  await Promise.all([HEAD(60), TEXT(36), TEXT(36, 600)].map((f) => document.fonts.load(f).catch(() => {})));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);

  // Фото с затемнением и обращением по имени
  const PH = 470;
  try {
    const img = await loadImg('assets/photos/coast.jpg');
    const s = Math.max(W / img.width, PH / img.height);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH); ctx.clip();
    ctx.drawImage(img, (W - img.width * s) / 2, (PH - img.height * s) * 0.5, img.width * s, img.height * s);
    ctx.restore();
  } catch { ctx.fillStyle = WINE; ctx.fillRect(0, 0, W, PH); }
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, 'rgba(52,9,16,.35)'); g.addColorStop(.4, 'rgba(52,9,16,.08)'); g.addColorStop(1, 'rgba(52,9,16,.92)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH);
  if (logoSvg) {
    try {
      const svg = logoSvg.replace(/currentColor/g, CREAM).replace('<svg ', '<svg width="720" height="127" ');
      ctx.drawImage(await loadImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`), X, 60, 260, 46);
    } catch { /* без логотипа */ }
  }
  ctx.fillStyle = CREAM; ctx.font = HEAD(64);
  const tl = wrap(ctx, title, MW).slice(0, 2);
  tl.forEach((l, i) => ctx.fillText(l, X, PH - 48 - (tl.length - 1 - i) * 74));

  let y = PH + 72;
  const line = (text, font, color, gap, max = 2) => {
    ctx.font = font; ctx.fillStyle = color;
    wrap(ctx, text, MW).slice(0, max).forEach((l) => { ctx.fillText(l, X, y); y += gap; });
  };
  line(who, TEXT(36, 600), WINE, 50);
  y += 26;

  // Сколько места под подарок и подвал
  const giftTop = H - 290;
  if (route.length || rider) {
    line(routeTitle, HEAD(40), INK, 58, 1);
    const rows = [...route.map((n, i) => `${i + 1}. ${n}`), ...(rider ? [`+ ${rider}`] : [])];
    const fit = Math.max(1, Math.floor((giftTop - 60 - y - (total ? 50 : 0)) / 50));
    rows.slice(0, fit).forEach((r) => line(r, TEXT(36), INK, 50, 1));
    if (rows.length > fit) line(`и ещё ${rows.length - fit}`, TEXT(36), WINE, 50, 1);
    if (total) line(total, TEXT(36, 600), WINE, 50, 1);
    y += 24;
  }
  if (season && y + 150 < giftTop) {
    line(seasonTitle, HEAD(40), INK, 58, 1);
    line(season, TEXT(36), INK, 50, giftTop - y > 140 ? 2 : 1);
  }

  if (gift) {
    const bh = 200;
    ctx.fillStyle = WINE; plate(ctx, X - 20, giftTop, MW + 40, bh, 40); ctx.fill();
    y = giftTop + 70;
    ctx.font = HEAD(38); ctx.fillStyle = CREAM;
    wrap(ctx, gift, MW - 20).slice(0, 2).forEach((l) => { ctx.fillText(l, X + 12, y); y += 50; });
    ctx.font = TEXT(30); ctx.fillStyle = 'rgba(242,234,227,.8)';
    ctx.fillText(giftNote, X + 12, giftTop + bh - 34);
  }
  ctx.fillStyle = WINE; ctx.font = TEXT(30, 600);
  ctx.fillText(`@${contacts.telegram} · ${contacts.phoneLabel}`, X, H - 34);

  return new Promise((res) => c.toBlob(res, 'image/png'));
}
