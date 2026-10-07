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

export function card(C, ex, { group = 's', inPlan = false, reason = '' } = {}) {
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
    <div class="card__foot">${addBtn(C, ex.id, inPlan)}</div>
  </article>`;
}

export function catalogHtml(C, { group = 's', filter = 'all', plan = [] } = {}) {
  return C.excursions.filter((ex) => filter === 'all' || ex.filters.includes(filter))
    .map((ex) => card(C, ex, { group, inPlan: plan.some((p) => p.id === ex.id) })).join('');
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
