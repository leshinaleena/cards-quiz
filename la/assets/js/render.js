// Чистые функции разметки: работают и в браузере, и в Node (tools/prerender.mjs),
// чтобы каталог, маршруты и вопросы были в HTML сразу — для поисковиков и быстрого первого экрана.
import { ILLUSTRATIONS, UI } from './icons.js?v=20';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nf = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
export const usd = (n) => `$${nf(n)}`;

/* ——— Типографика ———
   Правила вёрстки: предлоги, союзы и другие слова в 1–3 буквы, числа и «≈» не остаются в конце строки;
   перед тире — неразрывный пробел; частицы «ли, же, бы» не отрываются от слова. */
const NB = '\u00a0';
const SHORT = /(?<=^|[\s\u00a0(«„"—–-])([А-Яа-яЁё]{1,3}|[$≈№]?\d[\d\u00a0.,:]*|≈|№)[ \t]+(?=[^\s—–])/g;
export function typo(s) {
  if (typeof s !== 'string' || !/[А-Яа-яЁё]/.test(s)) return s;
  return s.replace(SHORT, `$1${NB}`)
    .replace(/[ \t]+([—–])(?=[ \t\u00a0])/g, `${NB}$1`)
    .replace(/[ \t]+(ли|же|бы)(?=[\s\u00a0.,!?:;)»]|$)/g, `${NB}$1`);
}
// Весь config, кроме текстов сообщений в мессенджер (их клиент копирует как есть)
export function typoConfig(c, key = '') {
  if (key === 'messages') return c;
  if (Array.isArray(c)) return c.map((x) => typoConfig(x));
  if (c && typeof c === 'object') return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typoConfig(v, k)]));
  return typo(c);
}
// Текст внутри готового HTML (теги, скрипты и стили не трогаем)
export function typoHtml(html) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map((p, i) => (i % 2 ? p : typo(p))).join('');
}
export const plural = (n, f) => f[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
export const tile = (icon, cls = '') => `<span class="tile ${cls}">${ILLUSTRATIONS[icon] || ''}</span>`;
export const hoursText = (h) => `${h} ${plural(h, ['час', 'часа', 'часов'])}`;

const GUESTS = { s: { max: 3, together: 'втроём' }, m: { max: 6, together: 'вшестером' } };

// Цена экскурсии: { value, label, short, note, each }
export function exPrice(C, group, ex, people) {
  if (group === 'l') return { value: null, label: C.plan.individual, short: '', note: 'для группы от 7 человек', each: '' };
  if (ex.perPerson) {
    if (people) return { value: ex.perPerson * people, label: `от ${usd(ex.perPerson * people)}`, short: '', note: `${people} ${plural(people, ['человек', 'человека', 'человек'])}`, each: '' };
    return { value: ex.perPerson, label: `от ${usd(ex.perPerson)}`, short: 'с человека', note: 'Трансфер включён', each: '' };
  }
  const v = ex.price[group];
  const g = GUESTS[group];
  return { value: v, label: usd(v), short: 'за автомобиль', note: `Автомобиль с гидом · до ${g.max} гостей`, each: `≈ ${usd(v / g.max)} с человека, если поедете ${g.together}` };
}

export function head(C, key) {
  const h = C[key];
  return `<div class="sec-head__num"><b>${esc(h.num)}</b>${esc(h.label)}</div>
    <h2 class="h2" id="${key}-h"><b>${esc(h.titleBold)}</b>${h.titleLight ? ` <span>${esc(h.titleLight)}</span>` : ''}</h2>
    ${h.lead ? `<p>${esc(h.lead)}</p>` : ''}`;
}

export const addBtn = (C, id, on) => `<button class="btn btn--main add ${on ? 'is-on' : ''}" type="button" data-add="${id}" aria-pressed="${on}">
  ${on ? `${UI.check}<span>${esc(C.catalog.added)}</span>` : `${UI.plus}<span>${esc(C.catalog.add)}</span>`}</button>`;

export function card(C, ex, { group = 's', inPlan = false, reason = '', compared = false } = {}) {
  const pr = exPrice(C, group, ex);
  const list = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<article class="card ${inPlan ? 'is-added' : ''}" data-card="${ex.id}">
    <div class="card__head">
      <span class="card__art">${tile(ex.icon)}</span>
      <div class="card__titles">
        ${ex.badge ? `<span class="badge badge--${ex.badge}">${esc(C.catalog.badges[ex.badge])}</span>` : ''}
        <h3 class="h3">${esc(ex.name)}</h3>
        <p class="card__hook">${esc(ex.hook)}</p>
      </div>
    </div>
    ${reason ? `<p class="card__reason">${esc(reason)}</p>` : ''}
    <p class="card__meta">${esc(ex.hours ? hoursText(ex.hours) : ex.duration)} · ${esc(ex.places)}</p>
    <div class="card__price">${esc(pr.label)}${pr.short ? ` <small>${esc(pr.short)}</small>` : ''}</div>
    <details class="more">
      <summary>Подробнее ${UI.down}</summary>
      <p class="card__lead">${esc(ex.lead)}</p>
      <p class="more__price">${esc(pr.note)}${pr.each ? ` · ${esc(pr.each)}` : ''}</p>
      <div class="more__grid">
        ${ex.fits?.length ? `<div class="fit"><b>${esc(C.catalog.fits)}</b>${list(ex.fits)}</div>` : ''}
        ${ex.notFor?.length ? `<div class="fit fit--no"><b>${esc(C.catalog.notFor)}</b>${list(ex.notFor)}</div>` : ''}
        <div class="fit"><b>${esc(C.catalog.program)}</b>${list(ex.points)}</div>
      </div>
      ${ex.terms ? `<p class="term">${esc(ex.terms)}</p>` : ''}
      ${ex.season ? `<p class="when"><b>Когда лучше:</b> ${esc(ex.season)}</p>` : ''}
      <button class="link-arrow more__map" type="button" data-map-ex="${ex.id}">${esc(C.catalog.onMap)}</button>
    </details>
    <div class="card__foot">${addBtn(C, ex.id, inPlan)}</div>
  </article>`;
}

export function catalogHtml(C, { group = 's', filter = 'all', plan = [], compare = [] } = {}) {
  return C.excursions.filter((ex) => filter === 'all' || ex.filters.includes(filter))
    .map((ex) => card(C, ex, { group, inPlan: plan.some((p) => p.id === ex.id), compared: compare.includes(ex.id) })).join('');
}

export function howHtml(C) {
  return `<ol class="steps">${C.how.steps.map((s, i) => `<li class="step"><span class="step__n">${i + 1}</span><h3 class="h3">${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>`;
}

export function routesHtml(C, { group = 's', plan = [] } = {}) {
  return C.routes.items.map((r) => {
    const inPlan = r.days.filter((d) => d !== 'free').every((id) => plan.some((p) => p.id === id));
    const total = group === 'l' ? null : r.days.filter((d) => d !== 'free').reduce((s, id) => s + exPrice(C, group, C.excursions.find((e) => e.id === id), id === 'heli' ? 2 : 0).value, 0);
    return `<article class="route">
      ${r.photo ? `<picture class="route__photo"><source srcset="assets/photos/${r.photo}.avif" type="image/avif"><source srcset="assets/photos/${r.photo}.webp" type="image/webp"><img src="assets/photos/${r.photo}.jpg" width="800" height="500" alt="${esc(r.alt)}" loading="lazy" decoding="async"></picture>` : ''}
      <h3 class="route__title">${esc(r.title)}</h3>
      <p class="route__text">${esc(r.text)}</p>
      <ol class="route__days">${r.days.map((id, i) => {
        const ex = C.excursions.find((e) => e.id === id);
        return `<li><span class="route__day">День ${i + 1}</span>${ex ? `<span class="route__art">${tile(ex.icon)}</span><span>${esc(ex.name)}</span>` : `<span class="route__art route__art--free"></span><span class="muted">${esc(C.quiz.dayFree)}</span>`}</li>`;
      }).join('')}</ol>
      <p class="route__sum">${total == null ? esc(C.plan.individual) : `от ${usd(total)} <small>за группу ${esc(C.groups[group].short)}${r.days.includes('heli') ? ', вертолёт на двоих' : ''}</small>`}</p>
      <button class="btn ${inPlan ? 'btn--ghost' : 'btn--main'} btn--block" type="button" data-route="${r.id}">${inPlan ? `${UI.check}<span>${esc(C.routes.added)}</span>` : `${UI.plus}<span>${esc(C.routes.add)}</span>`}</button>
    </article>`;
  }).join('');
}

export function whyHtml(C) {
  return C.why.items.map((w) => `<div class="why__item"><h3 class="h3">${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('');
}

export function reviewsHtml(C) {
  const r = C.reviews;
  return `<h3 class="reviews__title">${esc(r.title)}</h3>
    <div class="reviews__row">${r.items.map((it) => `<figure class="review"><blockquote><p>${esc(it.text)}</p></blockquote>
      <figcaption><b>${esc(it.author)}</b><span>${esc(it.about)}</span></figcaption></figure>`).join('')}</div>
    <p class="reviews__note">${esc(r.source)}</p>`;
}

export function faqHtml(C) {
  return C.faq.items.map((f) => `<details><summary>${esc(f.q)}${UI.plus}</summary><p>${esc(f.a)}</p></details>`).join('');
}

export function benefitsHtml(C) {
  const b = C.benefits;
  return `<div class="visa"><div class="visa__big">${esc(b.visaBig)}</div><h3 class="visa__title">${esc(b.visaTitle)}</h3><p>${esc(b.visaText)}</p></div>`;
}

export function conciergeHtml(C) {
  const k = C.riders.concierge;
  return `<div class="concierge__text">
      <h2 class="h2 h2--light" id="riders-h"><b>${esc(k.titleBold)}</b> <span>${esc(k.titleLight)}</span></h2>
      <p>${esc(k.text)}</p>
      <ul class="concierge__points">${k.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <button class="btn btn--light" type="button" data-open-lead="concierge">${esc(k.cta)}</button>
    </div>`;
}

/* ——— Карта: иллюстрированная схема в стиле травел-журнала ——— */
const BOX = { w: 1000, h: 640, lon0: -118.86, lon1: -117.80, lat0: 33.62, lat1: 34.22 };
const px = (lat, lon) => [
  Math.round(((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * BOX.w),
  Math.round(((BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0)) * BOX.h),
];
// Берег: Малибу → залив Санта-Моника → Палос-Вердес → Лонг-Бич → Хантингтон-Бич
const COAST = [[34.045, -118.90], [34.038, -118.76], [34.034, -118.66], [34.03, -118.56], [34.01, -118.50], [33.975, -118.46], [33.92, -118.425],
  [33.86, -118.40], [33.80, -118.405], [33.76, -118.42], [33.73, -118.37], [33.715, -118.30], [33.735, -118.26], [33.755, -118.20],
  [33.745, -118.12], [33.71, -118.05], [33.66, -117.98], [33.60, -117.88], [33.56, -117.76]];
const HILLS = [[34.06, -118.90], [34.13, -118.84], [34.17, -118.66], [34.155, -118.48], [34.15, -118.34], [34.125, -118.29], [34.10, -118.33],
  [34.09, -118.44], [34.075, -118.58], [34.055, -118.72]];
// Плавная кривая через точки (Catmull-Rom → Безье)
function smooth(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map(Math.round)} ${c2.map(Math.round)} ${p2}`;
  }
  return d;
}
const FAR = { nw: [28, 40, 'start'], se: [972, 560, 'end'], s: [972, 612, 'end'] };

// Остановки маршрута по дням: [{ n, ex, point | far }]
export function mapStops(C, trip) {
  return trip.map((id, i) => {
    const ex = C.excursions.find((e) => e.id === id);
    if (!ex) return null;
    const m = ex.mapMain || ex.map[0];
    return m.startsWith('far:') ? { n: i + 1, ex, far: m.slice(4) } : { n: i + 1, ex, point: m };
  }).filter(Boolean);
}

export function mapSvg(C, { trip = [], stops: given = null, label = 'Схема Лос-Анджелеса: Ваш маршрут по дням', names = true } = {}) {
  const M = C.map;
  const P = Object.fromEntries(Object.entries(M.points).map(([k, v]) => [k, px(v.lat, v.lon)]));
  const coast = COAST.map(([a, b]) => px(a, b));
  const sea = `${smooth(coast)} L${BOX.w},${BOX.h} L0,${BOX.h} Z`;
  const hills = `${smooth(HILLS.map(([a, b]) => px(a, b)))} Z`;
  const stops = given || mapStops(C, trip);
  // Повторная точка (две экскурсии в одном месте) — смещаем кружок, чтобы цифры не слипались
  const seen = {};
  const at = (s) => {
    if (s.far) { const [x, y] = FAR[M.far[s.far].dir]; return [x, y]; }
    const [x, y] = P[s.point]; const k = s.point; seen[k] = (seen[k] || 0) + 1;
    return [x + (seen[k] - 1) * 30, y - (seen[k] - 1) * 22];
  };
  const pos = stops.map((s) => ({ ...s, xy: at(s) }));
  const local = pos.filter((s) => !s.far);
  // Изогнутый пунктир между остановками в городе
  let path = '';
  for (let i = 0; i < local.length - 1; i += 1) {
    const [x1, y1] = local[i].xy; const [x2, y2] = local[i + 1].xy;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
    const k = 0.22;
    path += `M${x1},${y1} Q${Math.round(mx - dy * k)},${Math.round(my + dx * k)} ${x2},${y2} `;
  }
  const used = new Set(local.map((s) => s.point));
  const anchors = ['santamonica', 'hollywood', 'downtown', 'malibu', 'anaheim'];
  const faint = Object.keys(M.points).map((k) => {
    if (used.has(k)) return '';
    const [x, y] = P[k];
    const label = anchors.includes(k) ? `<text class="map__soft" x="${x > 800 ? x - 12 : x + 12}" y="${y + 6}" text-anchor="${x > 800 ? 'end' : 'start'}">${esc(M.points[k].name)}</text>` : '';
    return `<circle class="map__dot" cx="${x}" cy="${y}" r="5"/>${label}`;
  }).join('');
  const pins = local.map((s) => {
    const [x, y] = s.xy;
    const name = M.points[s.point].name;
    // Подпись справа от кружка; у правого края — над ним; если справа близко другая точка — под ним
    const left = x > 760;
    const crowded = local.some((o) => o !== s && o.xy[0] > x && o.xy[0] - x < 320 && Math.abs(o.xy[1] - y) < 90);
    let [lx, ly, la] = left ? [x + 10, y - 40, 'end'] : crowded ? [x, y - 42, 'middle'] : [x + 36, y + 10, 'start'];
    if (la === 'middle' && x < name.length * 11) [lx, la] = [Math.max(16, x - 26), 'start']; // у левого края — внутрь карты
    return `<g class="map__pin"><circle cx="${x}" cy="${y}" r="26"/><text class="map__n" x="${x}" y="${y + 9}">${s.n}</text>
      ${names ? `<text class="map__label" x="${lx}" y="${ly}" text-anchor="${la}">${esc(name)}</text>` : ''}</g>`;
  }).join('');
  const farTags = Object.entries(M.far).map(([k, f]) => {
    const on = pos.filter((s) => s.far === k);
    const [x, y, anchor] = FAR[f.dir];
    const text = `${f.name} · ${f.time}`;
    const w = Math.round(text.length * 13.4) + (on.length ? 66 : 34);
    const rx = anchor === 'end' ? x - w : x;
    return `<g class="map__far ${on.length ? 'is-on' : ''}"><rect x="${rx}" y="${y - 22}" width="${w}" height="44" rx="22"/>
      ${on.length ? `<circle cx="${rx + 24}" cy="${y}" r="15"/><text class="map__n map__n--sm" x="${rx + 24}" y="${y + 6}">${on.map((s) => s.n).join(',')}</text>` : ''}
      <text x="${rx + (on.length ? 48 : 16)}" y="${y + 7}">${esc(text)}</text></g>`;
  }).join('');
  return `<svg class="map__svg" viewBox="0 0 ${BOX.w} ${BOX.h}" role="img" aria-label="${esc(label)}">
    <defs><pattern id="waves" width="46" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 q11.5 -7 23 0 t23 0" class="map__wave"/></pattern></defs>
    <rect class="map__land" width="${BOX.w}" height="${BOX.h}"/>
    <path class="map__hills" d="${hills}"/>
    <path class="map__sea" d="${sea}"/><path d="${sea}" fill="url(#waves)"/>
    <path class="map__coast" d="${smooth(coast)}"/>
    <text class="map__ocean" x="70" y="560">Тихий океан</text>
    ${faint}
    ${path ? `<path class="map__path" d="${path}"/>` : ''}
    ${pins}
    ${farTags}
  </svg>`;
}

// Остановки одной экскурсии — по порядку программы
export function exStops(C, ex) {
  return ex.map.map((m, i) => (m.startsWith('far:') ? { n: i + 1, ex, far: m.slice(4) } : { n: i + 1, ex, point: m }));
}
export function exMapHtml(C, ex) {
  const M = C.map;
  const stops = exStops(C, ex);
  const where = (s) => (s.far ? `${M.far[s.far].time} ${M.fromCenter}` : M.times[s.point] ? (M.times[s.point] === 'в центре' ? 'в центре' : `${M.times[s.point]} ${M.fromCenter}`) : '');
  return `<div class="map__frame">${mapSvg(C, { stops, label: `Схема: ${ex.name}`, names: stops.length < 3 })}</div>
    <ol class="map__legend">${stops.map((s) => `<li><span class="map__ln">${s.n}</span><b>${esc(s.far ? M.far[s.far].name : M.points[s.point].name)}</b><span>${esc(where(s))}</span></li>`).join('')}</ol>`;
}

export function mapLegend(C, trip) {
  const M = C.map;
  const stops = mapStops(C, trip);
  if (!stops.length) return '';
  return `<ol class="map__legend">${stops.map((s) => {
    const where = s.far ? `${M.far[s.far].name}, ${M.far[s.far].time} ${M.fromCenter}` : `${M.points[s.point].name}${M.times[s.point] ? `, ${M.times[s.point] === 'в центре' ? 'в центре' : `${M.times[s.point]} ${M.fromCenter}`}` : ''}`;
    return `<li><span class="map__ln">${s.n}</span><b>${esc(s.ex.name)}</b><span>${esc(where)}</span></li>`;
  }).join('')}</ol>`;
}

/* ——— Сравнение ——— */
export function compareHtml(C, ids, group = 's') {
  const exs = ids.map((id) => C.excursions.find((e) => e.id === id)).filter(Boolean);
  const R = C.compare.rows;
  const yes = (ex, f) => (ex.filters.includes(f) || (f === 'kids' && ex.tags.includes('дети')) ? '✓' : '—');
  const rows = [
    [R.time, (ex) => esc(hoursText(ex.hours))],
    [R.where, (ex) => esc(ex.places)],
    [R.price, (ex) => { const p = exPrice(C, group, ex); return `<b>${esc(p.label)}</b><br><small>${esc(p.note)}</small>`; }],
    [R.kids, (ex) => yes(ex, 'kids')],
    [R.ocean, (ex) => yes(ex, 'ocean')],
    [R.height, (ex) => yes(ex, 'height')],
    [R.out, (ex) => yes(ex, 'out')],
    [R.fits, (ex) => `<ul>${(ex.fits || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`],
  ];
  return `<div class="cmp"><table>
    <thead><tr><th></th>${exs.map((ex) => `<th scope="col"><span class="cmp__art">${tile(ex.icon)}</span>${esc(ex.name)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label, f]) => `<tr><th scope="row">${esc(label)}</th>${exs.map((ex) => `<td>${f(ex)}</td>`).join('')}</tr>`).join('')}
      <tr><th></th>${exs.map((ex) => `<td><button class="btn btn--main btn--block add-sm" type="button" data-add="${ex.id}">${UI.plus}<span>${esc(C.catalog.add)}</span></button></td>`).join('')}</tr>
    </tbody></table></div>`;
}

/* ——— Советы консьержа: правила из config.advice, без «умного» сервера ——— */
const exOf = (C, id) => C.excursions.find((e) => e.id === id);
export const isFar = (ex) => Array.isArray(ex?.map) && ex.map.some((m) => String(m).startsWith('far:'));
export const paceText = (C, h) => (C.advice.pace.find((p) => h <= p.max) || C.advice.pace.at(-1)).text;

// ids — дни поездки по порядку ('free' — свободный день). Возвращает [{ text, action?, arg? }]
export function adviseTrip(C, ids) {
  const A = C.advice;
  const tips = [];
  const seen = new Set();
  ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
    const key = [a, b].sort().join('+');
    const ex = exOf(C, a);
    if (seen.has(key) || !ex?.overlaps?.includes(b)) return;
    seen.add(key);
    const rule = A.pairs[key];
    if (rule) tips.push({ text: rule.text, ...(rule.keep ? { action: rule.action, arg: `keep:${rule.keep}:${rule.keep === a ? b : a}` } : {}) });
  }));
  for (let i = 1; i < ids.length; i++) {
    const a = exOf(C, ids[i - 1]); const b = exOf(C, ids[i]);
    if (isFar(a) && isFar(b) && !seen.has([a.id, b.id].sort().join('+'))) {
      tips.push({ text: A.farRow.replace('{a}', a.name).replace('{b}', b.name), action: A.addFree, arg: `free:${i}` });
    }
  }
  let run = 0;
  for (let i = 0; i < ids.length; i++) {
    run = (exOf(C, ids[i])?.hours || 0) >= 8 ? run + 1 : 0;
    if (run === 3 && !tips.some((t) => t.arg?.startsWith('free:'))) tips.push({ text: A.longRow, action: A.addFree, arg: `free:${i}` });
  }
  return tips;
}

export function adviceHtml(C, ids) {
  const tips = adviseTrip(C, ids);
  if (ids.filter((id) => exOf(C, id)).length < 2) return '';
  const body = tips.length
    ? tips.map((t) => `<li><p>${esc(t.text)}</p>${t.action ? `<button class="link-arrow" type="button" data-advice="${esc(t.arg)}">${esc(t.action)}</button>` : ''}</li>`).join('')
    : `<li class="advice__ok"><p>${esc(C.advice.ok)}</p></li>`;
  return `<section class="advice ${tips.length ? '' : 'advice--ok'}" aria-label="${esc(C.advice.title)}"><b class="advice__title">${esc(C.advice.title)}</b><ul>${body}</ul></section>`;
}

// Одна фраза над картой: где проходит маршрут
export function mapNote(C, ids) {
  const far = [...new Set(ids.map((id) => exOf(C, id)).filter(isFar)
    .flatMap((ex) => ex.map.filter((m) => String(m).startsWith('far:')).map((m) => m.slice(4))))];
  if (!far.length) return C.advice.mapCity;
  return C.advice.mapFar.replace('{list}', far.map((k) => `${C.map.far[k].name} ${C.map.far[k].time}`).join(', '));
}

// Дальние выезды не ставим подряд, если есть чем их разделить
export function spreadFar(C, ids) {
  const far = ids.filter((id) => isFar(exOf(C, id)));
  const near = ids.filter((id) => !isFar(exOf(C, id)));
  if (far.length < 2 || near.length < far.length - 1) return ids;
  const [first, second] = near.length > far.length ? [near, far] : [far, near];
  const out = [];
  first.forEach((id, i) => { out.push(id); if (second[i]) out.push(second[i]); });
  second.slice(first.length).forEach((id) => out.push(id));
  return out;
}
