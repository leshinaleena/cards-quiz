// Открытка «Ваш Лос-Анджелес» 1080×1350 — рисуется в браузере, без сервера.
const W = 1080, H = 1350;
const WINE = '#69131D', CREAM = '#F2EAE3', RED = '#AB2328', INK = '#2B1B1E', MUTED = '#7E6D70';

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function roundDiag(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - 6, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 6);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + 6, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - 6);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export async function drawGift({ logoSvg, meta, route, total, rider, season, bonus, G, contacts }) {
  await Promise.all(['800 64px Montserrat', '600 24px Montserrat', '400 30px Inter', '600 30px Inter'].map((f) => document.fonts.load(f).catch(() => {})));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);

  // Фото сверху с винным затемнением
  const PH = 560;
  try {
    const img = await loadImg('assets/photos/coast.jpg');
    const s = Math.max(W / img.width, PH / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PH); ctx.clip();
    ctx.drawImage(img, (W - iw) / 2, (PH - ih) * 0.55, iw, ih);
    ctx.restore();
  } catch { ctx.fillStyle = WINE; ctx.fillRect(0, 0, W, PH); }
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, 'rgba(52,9,16,.35)'); g.addColorStop(.45, 'rgba(52,9,16,.05)'); g.addColorStop(1, 'rgba(52,9,16,.9)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, PH);

  if (logoSvg) {
    try {
      const svg = logoSvg.replace(/currentColor/g, CREAM).replace('<svg ', '<svg width="720" height="127" ');
      const logo = await loadImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      ctx.drawImage(logo, 72, 64, 300, 53);
    } catch { /* без логотипа */ }
  }
  ctx.fillStyle = CREAM;
  ctx.font = '800 76px Montserrat';
  ctx.fillText('ВАШ', 72, PH - 130);
  ctx.fillText('ЛОС-АНДЖЕЛЕС', 72, PH - 50);

  let y = PH + 70;
  const X = 72, MW = W - 144;
  ctx.fillStyle = WINE; ctx.font = '600 32px Inter';
  wrap(ctx, meta, MW).slice(0, 2).forEach((l) => { ctx.fillText(l, X, y); y += 42; });
  y += 18;

  const label = (t) => { ctx.fillStyle = RED; ctx.font = '600 22px Montserrat'; ctx.letterSpacing = '4px'; ctx.fillText(t.toUpperCase(), X, y); ctx.letterSpacing = '0px'; y += 44; };
  if (route.length || rider) {
    label(G.routeLabel);
    ctx.fillStyle = INK; ctx.font = '400 30px Inter';
    const shown = route.slice(0, 5);
    shown.forEach((name, i) => {
      const line = `День ${i + 1} — ${name}`;
      const l = wrap(ctx, line, MW)[0];
      ctx.fillText(l + (wrap(ctx, line, MW).length > 1 ? '…' : ''), X, y); y += 44;
    });
    if (route.length > 5) { ctx.fillStyle = MUTED; ctx.fillText(`и ещё ${route.length - 5}`, X, y); y += 44; }
    if (rider) { ctx.fillStyle = WINE; ctx.font = '600 30px Inter'; ctx.fillText(`+ ${rider}`, X, y); y += 44; }
    if (total) { ctx.fillStyle = MUTED; ctx.font = '400 26px Inter'; ctx.fillText(`Итого по экскурсиям: ${total}`, X, y); y += 40; }
    y += 20;
  }
  if (season && y < 1000) {
    label(season.title);
    ctx.fillStyle = INK; ctx.font = '400 28px Inter';
    season.tips.forEach((t) => { wrap(ctx, `· ${t}`, MW).slice(0, 2).forEach((l) => { if (y < 1040) { ctx.fillText(l, X, y); y += 38; } }); });
  }

  // Подарок — винная плашка внизу
  if (bonus) {
    const by = H - 270, bh = 190;
    ctx.fillStyle = WINE; roundDiag(ctx, X - 16, by, MW + 32, bh, 36); ctx.fill();
    ctx.fillStyle = '#E9A39E'; ctx.font = '600 20px Montserrat'; ctx.letterSpacing = '4px';
    ctx.fillText(G.giftLabel.toUpperCase(), X + 16, by + 48); ctx.letterSpacing = '0px';
    ctx.fillStyle = CREAM; ctx.font = '800 32px Montserrat';
    const tl = wrap(ctx, bonus.title, MW - 32).slice(0, 2);
    tl.forEach((l, i) => ctx.fillText(l, X + 16, by + 94 + i * 40));
    ctx.fillStyle = 'rgba(242,234,227,.75)'; ctx.font = '400 24px Inter';
    ctx.fillText(G.giftNote[0].toUpperCase() + G.giftNote.slice(1), X + 16, by + 94 + tl.length * 40 + 4);
  }
  ctx.fillStyle = MUTED; ctx.font = '400 22px Inter';
  ctx.fillText(`@${contacts.telegram} · ${contacts.phoneLabel} · ${contacts.site}`, X, H - 40);

  return new Promise((res) => c.toBlob(res, 'image/png'));
}
