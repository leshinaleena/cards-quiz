// Чистые функции разметки: работают и в браузере, и в Node (tools/prerender.mjs),
// чтобы каталог, маршруты и вопросы были в HTML сразу — для поисковиков и быстрого первого экрана.
import { ILLUSTRATIONS, UI } from './icons.js?v=3';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nf = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
export const usd = (n) => `$${nf(n)}`;
export const plural = (n, f) => f[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
export const tile = (icon, cls = '') => `<span class="tile ${cls}">${ILLUSTRATIONS[icon] || ''}</span>`;
export const hoursText = (h) => `${h} ${plural(h, ['час', 'часа', 'часов'])}`;

const GUESTS = { s: { max: 3, together: 'втроём' }, m: { max: 6, together: 'вшестером' } };

// Цена экскурсии: { value, label, note, each }
export function exPrice(C, group, ex, people) {
  if (group === 'l') return { value: null, label: C.plan.individual, note: 'для группы от 7 человек', each: '' };
  if (ex.perPerson) {
    if (people) return { value: ex.perPerson * people, label: `от ${usd(ex.perPerson * people)}`, note: `${people} ${plural(people, ['человек', 'человека', 'человек'])}`, each: '' };
    return { value: ex.perPerson, label: `от ${usd(ex.perPerson)}`, note: 'с человека, трансфер включён', each: '' };
  }
  const v = ex.price[group];
  const g = GUESTS[group];
  return { value: v, label: usd(v), note: `за автомобиль с гидом · до ${g.max} гостей`, each: `≈ ${usd(v / g.max)} с человека, если поедете ${g.together}` };
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
    <p class="card__lead">${esc(ex.lead)}</p>
    <div class="card__price">${esc(pr.label)}<small>${esc(pr.note)}</small>${pr.each ? `<small class="card__each">${esc(pr.each)}</small>` : ''}</div>
    <details class="more">
      <summary>Подробнее ${UI.down}</summary>
      <div class="more__grid">
        ${ex.fits?.length ? `<div class="fit"><b>${esc(C.catalog.fits)}</b>${list(ex.fits)}</div>` : ''}
        ${ex.notFor?.length ? `<div class="fit fit--no"><b>${esc(C.catalog.notFor)}</b>${list(ex.notFor)}</div>` : ''}
        <div class="fit"><b>${esc(C.catalog.program)}</b>${list(ex.points)}</div>
      </div>
      ${ex.terms ? `<p class="term">${esc(ex.terms)}</p>` : ''}
      ${ex.season ? `<p class="when"><b>Когда лучше:</b> ${esc(ex.season)}</p>` : ''}
    </details>
    <div class="card__foot">${addBtn(C, ex.id, inPlan)}
      <button class="cmp-toggle ${compared ? 'is-on' : ''}" type="button" data-compare="${ex.id}" aria-pressed="${compared}">${compared ? UI.check : UI.plus}<span>${esc(compared ? C.compare.on : C.compare.button)}</span></button></div>
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

export function faqHtml(C) {
  return C.faq.items.map((f) => `<details><summary>${esc(f.q)}${UI.plus}</summary><p>${esc(f.a)}</p></details>`).join('');
}

export function benefitsHtml(C) {
  const b = C.benefits;
  return `<div class="visa"><div class="visa__big">${esc(b.visaBig)}</div><h3 class="visa__title">${esc(b.visaTitle)}</h3><p>${esc(b.visaText)}</p></div>
    <div class="loyal"><h3 class="loyal__title">${esc(b.loyaltyTitle)}</h3>
      <div class="loyal__row">${b.loyalty.map((l) => `<div><b>${esc(l.off)}</b><span>${esc(l.trips)}</span></div>`).join('')}</div></div>`;
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

/* ——— Карта: схема Лос-Анджелеса с точками экскурсий ——— */
const BOX = { w: 1000, h: 620, lon0: -118.82, lon1: -117.82, lat0: 33.66, lat1: 34.22 };
const px = (lat, lon) => [
  Math.round(((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * BOX.w),
  Math.round(((BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0)) * BOX.h),
];
// Упрощённая береговая линия: Малибу → Санта-Моника → Палос-Вердес → Лонг-Бич → Хантингтон
const COAST = [[34.04, -118.84], [34.036, -118.68], [34.02, -118.56], [34.005, -118.49], [33.97, -118.46], [33.90, -118.42], [33.83, -118.395],
  [33.77, -118.42], [33.74, -118.40], [33.71, -118.30], [33.73, -118.27], [33.755, -118.20], [33.745, -118.12], [33.70, -118.05], [33.64, -117.95], [33.60, -117.86]];
const HILLS = [[34.06, -118.84], [34.12, -118.80], [34.16, -118.62], [34.14, -118.45], [34.14, -118.34], [34.12, -118.30], [34.10, -118.36], [34.085, -118.46], [34.07, -118.60], [34.045, -118.70]];
const FAR = { nw: [64, 70], se: [930, 560], s: [770, 590] };

export function mapSvg(C, { focus = null, trip = [] } = {}) {
  const M = C.map;
  const P = Object.fromEntries(Object.entries(M.points).map(([k, v]) => [k, px(v.lat, v.lon)]));
  const coast = COAST.map(([a, b]) => px(a, b));
  const sea = `M${coast.map((p) => p.join(',')).join(' L')} L${BOX.w},${BOX.h} L0,${BOX.h} Z`;
  const hills = `M${HILLS.map(([a, b]) => px(a, b).join(',')).join(' L')} Z`;
  const routeOf = (ex) => ex.map.map((id) => (id.startsWith('far:') ? FAR[M.far[id.slice(4)].dir] : P[id]));
  const line = (ex, cls) => {
    const pts = routeOf(ex);
    const far = ex.map.find((id) => id.startsWith('far:'));
    const start = far ? [P.downtown] : [];
    const all = [...start, ...pts];
    if (all.length < 2) return '';
    return `<polyline class="map__route ${cls}" points="${all.map((p) => p.join(',')).join(' ')}"/>`;
  };
  const tripEx = C.excursions.filter((e) => trip.includes(e.id));
  const focusEx = focus ? C.excursions.find((e) => e.id === focus) : null;
  const used = new Set([...tripEx, ...(focusEx ? [focusEx] : [])].flatMap((e) => e.map));
  const dot = (id) => {
    const [x, y] = P[id];
    const on = used.has(id);
    const name = M.points[id].name;
    const time = M.times[id];
    const side = M.points[id].side || (x < 820 ? 'r' : 'l');
    const tx = side === 'r' ? x + 14 : side === 'l' ? x - 14 : x;
    const ty = side === 'b' ? y + 30 : y + 6;
    const anchor = { r: 'start', l: 'end', b: 'middle' }[side];
    return `<g class="map__pt ${on ? 'is-on' : ''}"><circle cx="${x}" cy="${y}" r="${on ? 9 : 6}"/>
      <text x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(name)}${time ? `<tspan class="map__time" dx="6">${esc(time)}</tspan>` : ''}</text></g>`;
  };
  const farMark = (k) => {
    const f = M.far[k]; const [x, y] = FAR[f.dir];
    const on = used.has(`far:${k}`);
    const ax = f.dir === 'nw' ? -1 : 1; const ay = f.dir === 'nw' ? -1 : 1;
    return `<g class="map__far ${on ? 'is-on' : ''}"><path d="M${x},${y} l${ax * 18},${ay * 18} M${x + ax * 18},${y + ay * 18} l${-ax * 12},0 M${x + ax * 18},${y + ay * 18} l0,${-ay * 12}"/>
      <text x="${f.dir === 'nw' ? x + 30 : x - 10}" y="${f.dir === 'nw' ? y + 6 : y - 16}" text-anchor="${f.dir === 'nw' ? 'start' : 'end'}">${esc(f.name)} <tspan class="map__time">${esc(f.time)}</tspan></text></g>`;
  };
  return `<svg class="map__svg" viewBox="0 0 ${BOX.w} ${BOX.h}" role="img" aria-label="Схема Лос-Анджелеса с местами экскурсий">
    <rect class="map__land" width="${BOX.w}" height="${BOX.h}"/>
    <path class="map__hills" d="${hills}"/>
    <path class="map__sea" d="${sea}"/>
    <text class="map__ocean" x="250" y="470">Тихий океан</text>
    ${tripEx.map((e) => line(e, 'is-trip')).join('')}
    ${focusEx ? line(focusEx, 'is-focus') : ''}
    ${Object.keys(M.far).map(farMark).join('')}
    ${Object.keys(M.points).map(dot).join('')}
  </svg>`;
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
