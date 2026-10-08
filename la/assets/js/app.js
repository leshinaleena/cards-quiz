// TOP RIDERS · Лос-Анджелес. Все тексты и цены — в config.json.
import { UI } from './icons.js?v=7';
import { drawGift } from './gift.js?v=7';
import * as R from './render.js?v=7';

const VERSION = '7';
const STORE = 'tr-la-v1';
const debug = new URLSearchParams(location.search).has('debug');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let C;            // config
let logoSvg = '';
const S = {       // состояние, сохраняется в браузере
  group: 's',     // s · m · l
  plan: [],       // [{ id, people? }]
  rider: null,    // { id, days, adults }
  currency: 'rub',
  travelPkg: 7,
  month: null,
  calc: { days: 7, adults: 2, need: 'route', goal: 'rest' },
  compare: [],
  quiz: null,     // { who, days, likes:[], people }
  picked: [],
};
const Q = { screen: 'q', idx: 0, answers: { likes: [] } };
let quizStarted = false;
let filter = 'all';
let view = 'cards';
let mapFocus = null;

/* ——— Утилиты ——— */
const get = (path) => path.split('.').reduce((o, k) => o?.[k], C);
const nf = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const usd = (n) => `$${nf(n)}`;
const rub = (n) => `${nf(n)} ₽`;
const money = (v) => (S.currency === 'rub' ? rub(v.rub) : `${nf(v.usd)} $`);
const plural = (n, f) => f[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
const days = (n) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
const tile = R.tile;
const exById = (id) => C.excursions.find((e) => e.id === id);
const isFree = (item) => item.id === 'free';
const exItems = () => S.plan.filter((p) => !isFree(p));
let leadMode = 'plan';

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* приватный режим */ }
}
function restore() {
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch { /* пусто */ }
  S.plan = (S.plan || []).filter((p) => isFree(p) || exById(p.id));
}

function reach(goal) {
  if (debug) console.log('[metrika]', goal);
  const id = C.analytics?.metrikaId;
  if (id && window.ym) window.ym(id, 'reachGoal', goal);
}

let toastTimer;
function toast(text) {
  const el = $('[data-toast]');
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2600);
}

function swap(fn) {
  if (document.startViewTransition && !reduced) document.startViewTransition(fn);
  else fn();
}

/* ——— Цены ——— */
function heliPeople(item) {
  return item?.people || (S.group === 'm' ? 4 : 2);
}
// Цена экскурсии для текущей группы: { value, label, note, each }
function exPrice(ex, item) {
  return R.exPrice(C, S.group, ex, ex.perPerson && item ? heliPeople(item) : 0);
}
function planTotal() {
  if (S.group === 'l') return null;
  return exItems().reduce((sum, item) => sum + (exPrice(exById(item.id), item).value || 0), 0);
}

function riderCalc(id, d, adults, cur = S.currency) {
  const r = C.riders.items.find((x) => x.id === id);
  const out = { id, name: r.name, value: 0, cur, extra: '', term: '' };
  if (id === 'standard') {
    const extra = Math.max(0, adults - 4);
    out.value = r.price[cur] + extra * r.extraAdult[cur];
    out.term = `${adults} ${plural(adults, ['взрослый', 'взрослых', 'взрослых'])}`;
  } else if (id === 'travel') {
    const pkg = d <= 7 ? r.packages[0] : r.packages[1];
    out.value = pkg[cur];
    out.term = pkg.label;
    if (d > 14) {
      if (cur === 'usd') { out.value += (d - 14) * r.extraDayUsd; out.term = days(d); }
      else out.extra = C.riders.calc.extraDaysRub;
    }
  } else {
    out.value = r.price[cur];
    out.term = r.for;
    if (d > 14) out.extra = C.riders.calc.topLong;
  }
  out.label = cur === 'rub' ? rub(out.value) : `${nf(out.value)} $`;
  return out;
}
function recommend() {
  const { need, goal } = S.calc;
  if (goal === 'move') return 'top';
  return need === 'tickets' ? 'standard' : 'travel';
}

const head = (key) => R.head(C, key);

/* ——— Квиз ——— */
function visibleQuestions() {
  const who = C.quiz.questions[0].options.find((o) => o.id === Q.answers.who);
  const skip = who?.skip || [];
  return C.quiz.questions.filter((q) => !skip.includes(q.id));
}

function renderQuiz() {
  const box = $('[data-quiz]');
  if (Q.screen === 'intro') {
    box.innerHTML = `<div class="quiz__intro">
      <p class="quiz__q">${esc(C.quiz.questions[0].text)}</p>
      <p>${esc(C.quiz.lead)}</p>
      <div><button class="btn btn--main" type="button" data-qstart>${esc(C.hero.cta)}</button></div>
    </div>`;
    return;
  }
  if (Q.screen === 'result') { renderResult(box); return; }

  const qs = visibleQuestions();
  const q = qs[Q.idx];
  const val = Q.answers[q.id];
  const pct = Math.round((Q.idx / qs.length) * 100);
  box.innerHTML = `
    <div class="quiz__top">
      <span class="quiz__count">Вопрос ${Q.idx + 1} из ${qs.length}</span>
      <span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${Q.idx}"><i style="width:${pct}%"></i></span>
    </div>
    <h3 class="quiz__q">${esc(q.text)}</h3>
    ${q.hint ? `<p class="quiz__hint">${esc(q.hint)}</p>` : ''}
    <div class="options ${q.options.length > 4 ? 'options--2' : ''}" role="${q.multi ? 'group' : 'radiogroup'}">
      ${q.options.map((o) => {
        const on = q.multi ? (val || []).includes(o.id) : val === o.id;
        return `<button class="opt" type="button" ${q.multi ? `aria-pressed="${on}"` : `role="radio" aria-checked="${on}"`} data-opt="${o.id}">
          <span>${esc(o.text)}</span><span class="opt__mark">${UI.check}</span></button>`;
      }).join('')}
    </div>
    <div class="quiz__nav">
      ${Q.idx > 0 ? `<button class="quiz__back" type="button" data-qback>${UI.back}<span>Назад</span></button>` : '<span></span>'}
      ${q.multi ? `<button class="btn btn--main" type="button" data-qnext ${(val || []).length ? '' : 'disabled'}>Дальше</button>` : ''}
    </div>`;
}

function answer(optId) {
  if (!quizStarted) { quizStarted = true; reach('quiz_start'); }
  const qs = visibleQuestions();
  const q = qs[Q.idx];
  if (q.multi) {
    const opt = q.options.find((o) => o.id === optId);
    let list = Q.answers[q.id] || [];
    if (opt.exclusive) list = list.includes(optId) ? [] : [optId];
    else {
      list = list.filter((id) => !q.options.find((o) => o.id === id)?.exclusive);
      list = list.includes(optId) ? list.filter((x) => x !== optId) : [...list, optId];
    }
    Q.answers[q.id] = list;
    renderQuiz();
    $(`[data-opt="${optId}"]`)?.focus();
    return;
  }
  Q.answers[q.id] = optId;
  renderQuiz();
  setTimeout(next, reduced ? 0 : 220);
}

function next() {
  const qs = visibleQuestions();
  if (Q.idx < qs.length - 1) { swap(() => { Q.idx += 1; renderQuiz(); }); return; }
  finishQuiz();
}

function back() {
  if (Q.idx === 0) return;
  swap(() => { Q.idx -= 1; renderQuiz(); });
}

function quizTags() {
  const tags = new Set();
  for (const q of C.quiz.questions) {
    const v = Q.answers[q.id];
    for (const id of [].concat(v || [])) (q.options.find((o) => o.id === id)?.tags || []).forEach((t) => tags.add(t));
  }
  return tags;
}

function pickResults() {
  const [qWho, qDays, qLikes] = C.quiz.questions;
  const who = qWho.options.find((o) => o.id === Q.answers.who);
  const dayOpt = qDays.options.find((o) => o.id === Q.answers.days) || qDays.options[1];
  const likes = (Q.answers.likes || []).map((id) => qLikes.options.find((o) => o.id === id)).filter(Boolean);
  const kids = Q.answers.who === 'kids';
  const base = kids ? C.quiz.kidsFirst : C.quiz.popular;

  let ranked = [];
  if (likes.length && !likes.some((o) => o.exclusive)) {
    const likeTags = new Set(likes.flatMap((o) => o.tags));
    ranked = C.excursions.map((ex, i) => {
      let s = ex.tags.filter((t) => likeTags.has(t)).length * 3;
      if (who?.tags?.some((t) => ex.tags.includes(t))) s += 1.5;
      if (kids && C.quiz.kidsFirst.includes(ex.id)) s += 4;
      return { id: ex.id, s: s - i * 0.01 };
    }).filter((x) => x.s > 1).sort((a, b) => b.s - a.s).map((x) => x.id);
  }
  // Сначала совпадения, потом популярное; похожие экскурсии (одна включает другую) не ставим вместе
  const out = [];
  for (const id of [...ranked, ...base, ...C.excursions.map((e) => e.id)]) {
    if (out.length >= dayOpt.count) break;
    if (out.includes(id)) continue;
    if (out.some((x) => (exById(x).overlaps || []).includes(id))) continue;
    out.push(id);
  }
  return out;
}

function reasonFor(ex) {
  const qLikes = C.quiz.questions[2];
  const parts = (Q.answers.likes || [])
    .map((id) => qLikes.options.find((o) => o.id === id))
    .filter((o) => o?.reason && o.tags.some((t) => ex.tags.includes(t)))
    .map((o) => o.reason);
  if (Q.answers.who === 'kids' && ex.tags.includes('дети')) parts.push('с детьми');
  return parts.length ? `${C.quiz.reasonPrefix} ${parts.join(', ')}` : '';
}

function finishQuiz() {
  const who = C.quiz.questions[0].options.find((o) => o.id === Q.answers.who);
  const people = C.quiz.questions[3].options.find((o) => o.id === Q.answers.people);
  S.group = who?.group || people?.group || S.group;
  S.quiz = { ...Q.answers, likes: [...(Q.answers.likes || [])] };
  S.picked = pickResults();
  save();
  reach('quiz_done');
  logEvent('Квиз пройден');
  swap(() => { Q.screen = 'result'; renderQuiz(); renderCatalog(); renderGroupSeg(); });
  const top = $('#quiz').getBoundingClientRect().top;
  if (top < -40) $('#quiz').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

const card = (ex, opts = {}) => R.card(C, ex, { group: S.group, inPlan: S.plan.some((p) => p.id === ex.id), compared: (S.compare || []).includes(ex.id), ...opts });

function renderResult(box) {
  const long = S.quiz?.days === 'd5';
  const exs = S.picked.map(exById);
  const hours = exs.reduce((h, ex) => h + (ex.hours || 0), 0);
  const total = S.group === 'l' ? null : exs.reduce((t, ex) => t + exPrice(ex, ex.perPerson ? { people: heliPeople() } : null).value, 0);
  const sum = total == null ? C.plan.individual : `${usd(total)} за группу ${C.groups[S.group].short}`;
  box.innerHTML = `
    <h3 class="result__title">${esc(C.quiz.resultTitle)}</h3>
    <p class="result__lead">${esc(C.quiz.resultLead)}</p>
    <ol class="dayplan">${exs.map((ex, i) => {
      const pr = exPrice(ex, ex.perPerson ? { people: heliPeople() } : null);
      const reason = reasonFor(ex);
      return `<li class="dayplan__row">
        <span class="dayplan__day">День ${i + 1}</span>
        <span class="dayplan__art">${tile(ex.icon)}</span>
        <div class="dayplan__body"><b>${esc(ex.name)}</b><span>${esc(ex.hook)}</span>
          <small>${esc(R.hoursText(ex.hours))} · ${esc(S.group === 'l' ? C.plan.individual : usd(pr.value))}${reason ? ` · ${esc(reason)}` : ''}</small></div>
      </li>`;
    }).join('')}</ol>
    <p class="result__sum">${esc(C.quiz.summary.replace('{days}', days(exs.length)).replace('{hours}', `≈ ${hours} ч`).replace('{sum}', sum))}</p>
    ${long ? `<div class="note"><p>${esc(C.quiz.longNote)}</p><a class="link-arrow" href="#riders">${esc(C.quiz.longLink)}</a></div>` : ''}
    <div class="result__next">
      <p class="result__nexttitle">${esc(C.quiz.next)}</p>
      <p>${esc(C.quiz.nextText)}</p>
      <button class="btn btn--main btn--block" type="button" data-result-send>${esc(C.quiz.send)}</button>
      <button class="btn btn--ghost btn--block" type="button" data-result-keep>${esc(C.quiz.keep)}</button>
      <button class="quiz__back result__restart" type="button" data-qrestart>${esc(C.quiz.restart)}</button>
    </div>`;
}

function takeResult() {
  S.picked.forEach((id) => { if (!S.plan.some((p) => p.id === id)) S.plan.push(id === 'heli' ? { id, people: heliPeople() } : { id }); });
  save(); refreshCards();
  reach('excursion_add');
}

/* ——— Каталог ——— */
function renderGroupSeg() {
  $('[data-groupseg]').innerHTML = Object.entries(C.groups).map(([k, g]) =>
    `<button type="button" role="radio" aria-checked="${S.group === k}" data-group="${k}">${esc(g.label)}</button>`).join('');
}
function renderFilters() {
  $('[data-filters]').innerHTML = C.catalog.filters.map((f) =>
    `<button class="chip" type="button" role="tab" aria-selected="${filter === f.id}" data-filter="${f.id}">${esc(f.text)}</button>`).join('');
}
function renderCatalog() {
  $('[data-grid]').innerHTML = R.catalogHtml(C, { group: S.group, filter, plan: S.plan, compare: S.compare || [] });
  $('[data-grid]').hidden = view === 'map';
  $('[data-map]').hidden = view !== 'map';
  if (view === 'map') renderMap();
  renderCompareBar();
  $('[data-routes]').innerHTML = R.routesHtml(C, { group: S.group, plan: S.plan });
  if (Q.screen === 'result') renderQuiz();
}
function renderViewSeg() {
  $('[data-viewseg]').innerHTML = [['cards', C.map.cards], ['map', C.map.title]].map(([k, t]) =>
    `<button type="button" role="radio" aria-checked="${view === k}" data-view="${k}">${esc(t)}</button>`).join('');
}
function renderMap() {
  const list = C.excursions.filter((ex) => filter === 'all' || ex.filters.includes(filter));
  const trip = exItems().map((i) => i.id);
  const box = $('[data-map]');
  const scrollX = box.querySelector('.map__frame')?.scrollLeft;
  box.innerHTML = `
    <p class="map__hint">${esc(C.map.lead)}</p>
    <div class="map__frame">${R.mapSvg(C, { focus: mapFocus, trip })}</div>
    <p class="map__hint">${esc(C.map.hint)} <span class="mobile-only">${esc(C.map.hintMobile)}</span></p>
    <div class="map__list" role="radiogroup" aria-label="Показать маршрут">${list.map((ex) =>
      `<button class="chip ${trip.includes(ex.id) ? 'is-trip' : ''}" type="button" role="radio" aria-checked="${mapFocus === ex.id}" data-mapfocus="${ex.id}">${esc(ex.name)}</button>`).join('')}</div>
    ${mapFocus ? `<div class="map__focus">${card(exById(mapFocus), { compared: (S.compare || []).includes(mapFocus) })}</div>` : ''}`;
  const frame = box.querySelector('.map__frame');
  if (scrollX != null) frame.scrollLeft = scrollX;
  else if (frame.scrollWidth > frame.clientWidth) frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) * 0.3;
}
function renderCompareBar() {
  const n = (S.compare || []).length;
  const bar = $('[data-cmpbar]');
  bar.hidden = n === 0;
  $('[data-cmpcount]').textContent = n < 2 ? 'Выберите ещё одну' : `${n} ${plural(n, ['экскурсия', 'экскурсии', 'экскурсий'])}`;
  const btn = $('[data-open-cmp]');
  btn.textContent = `${C.compare.bar}${n ? ` (${n})` : ''}`;
  btn.disabled = n < 2;
}
function toggleCompare(id) {
  const list = S.compare || (S.compare = []);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else if (list.length >= 3) { toast(C.compare.max); return; }
  else list.push(id);
  save(); renderCatalog();
}
function renderCompare() {
  $('[data-cmp]').innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="cmp-h">${esc(C.compare.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    ${R.compareHtml(C, S.compare, S.group)}`;
}

function addRoute(route) {
  const ids = route.days;
  const allIn = ids.filter((d) => d !== 'free').every((id) => S.plan.some((p) => p.id === id));
  if (allIn) { S.plan = S.plan.filter((p) => !ids.includes(p.id)); toast(C.toasts.removed); }
  else {
    for (const id of ids) {
      if (id === 'free') S.plan.push({ id: 'free' });
      else if (!S.plan.some((p) => p.id === id)) S.plan.push(id === 'heli' ? { id, people: heliPeople() } : { id });
    }
    toast(C.toasts.routeAdded);
    reach('excursion_add');
  }
  save(); refreshCards();
}

function refreshCards() {
  renderCatalog();
  updateDock();
}

function toggleExcursion(id) {
  const i = S.plan.findIndex((p) => p.id === id);
  if (i >= 0) { S.plan.splice(i, 1); toast(C.toasts.removed); }
  else {
    S.plan.push(id === 'heli' ? { id, people: heliPeople() } : { id });
    toast(C.toasts.added);
    reach('excursion_add');
  }
  save();
  refreshCards();
  if ($('#planSheet').open) renderPlan();
  if ($('#cmpSheet').open) renderCompare();
}

/* ——— Сезоны ——— */
function renderSeasons() {
  const m = C.seasons.months;
  $('[data-months]').innerHTML = m.map((x, i) =>
    `<button class="chip" type="button" role="radio" aria-checked="${S.month === i}" data-month="${i}" aria-label="${esc(x.name)}">${esc(x.short)}</button>`).join('');
  const box = $('[data-season]');
  if (S.month == null) {
    box.innerHTML = `<span class="season__art">${tile('sun', 'tile--warm')}</span>
      <div class="season__all">${groupMonths().map(([names, tips]) => `<div><b>${esc(names)}</b><span>${esc(tips)}</span></div>`).join('')}</div>
      <p class="season__always">${esc(C.seasons.always)}</p>
      <p class="season__note">${esc(C.seasons.note)}</p>`;
    return;
  }
  const mo = m[S.month];
  box.innerHTML = `<span class="season__art">${tile('sun', 'tile--warm')}</span>
    <h3 class="season__title">${esc(mo.name)}</h3>
    <ul>${mo.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <p class="season__always">${esc(C.seasons.always)}</p>
    <p class="season__note">${esc(C.seasons.note)}</p>`;
}
// Короткий обзор сезонов, пока месяц не выбран
function groupMonths() {
  return [
    ['Дек — апр', 'Серые киты, в парках спокойнее в будни января — февраля'],
    ['Май — июнь', 'Жакаранды и утренний туман у океана'],
    ['Июнь — сен', 'Синие киты и горбачи, самая тёплая вода в августе — сентябре'],
    ['Авг — окт', 'Сбор урожая в винных долинах, хеллоуинский сезон'],
    ['Ноя — дек', 'Рождественское оформление парков'],
  ];
}

/* ——— Райдеры ——— */
function renderRiders() {
  $('[data-currency]').innerHTML = [['rub', '₽'], ['usd', '$']].map(([k, t]) =>
    `<button type="button" role="radio" aria-checked="${S.currency === k}" data-cur="${k}">${t}</button>`).join('');

  $('[data-riders]').innerHTML = C.riders.items.map((r) => {
    let price;
    if (r.id === 'travel') {
      const pkg = r.packages.find((p) => p.days === S.travelPkg) || r.packages[0];
      price = `<div class="seg" role="radiogroup" aria-label="Длительность">${r.packages.map((p) =>
        `<button type="button" role="radio" aria-checked="${p.days === pkg.days}" data-pkg="${p.days}">${esc(p.label)}</button>`).join('')}</div>
        <div class="rider__price">${money(pkg)}</div>`;
    } else {
      price = `<div class="rider__price">${money(r.price)}</div>`;
    }
    const fill = (s) => s.replace('{service}', r.service ? money(r.service) : '').replace('{adult}', r.extraAdult ? money(r.extraAdult) : '');
    const inPlan = S.rider?.id === r.id;
    return `<article class="rider ${r.badge ? 'rider--hot' : ''}">
      ${r.badge ? `<span class="rider__badge">${esc(r.badge)}</span>` : ''}
      <div><h3 class="rider__name">${esc(r.name)}</h3>${r.for ? `<div class="rider__for">${esc(r.for)}</div>` : ''}</div>
      ${price}
      <ul>${r.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${r.bonus ? `<p class="rider__bonus">${esc(r.bonus)}</p>` : ''}
      <div class="rider__extras">${r.extras.map((x) => `<span>${esc(fill(x))}</span>`).join('')}</div>
      <div class="rider__foot"><button class="btn btn--ghost" type="button" data-rider-add="${r.id}">${inPlan ? `${UI.check} В поездке` : 'Добавить в поездку'}</button></div>
    </article>`;
  }).join('');
  renderCalc();
}

function renderCalc() {
  const k = C.riders.calc;
  const rec = recommend();
  const res = riderCalc(rec, S.calc.days, S.calc.adults);
  const inPlan = S.rider?.id === rec && S.rider.days === S.calc.days && S.rider.adults === S.calc.adults;
  const stepper = (key, min, max) => `<div class="stepper">
    <button type="button" data-step="${key}" data-d="-1" aria-label="Меньше" ${S.calc[key] <= min ? 'disabled' : ''}>${UI.minus}</button>
    <output aria-live="polite">${S.calc[key]}</output>
    <button type="button" data-step="${key}" data-d="1" aria-label="Больше" ${S.calc[key] >= max ? 'disabled' : ''}>${UI.plus}</button></div>`;
  const choice = (key, list) => `<div class="choice" role="radiogroup">${list.map((o) =>
    `<button class="opt" type="button" role="radio" aria-checked="${S.calc[key] === o.id}" data-calc="${key}" data-v="${o.id}"><span>${esc(o.text)}</span><span class="opt__mark">${UI.check}</span></button>`).join('')}</div>`;
  $('[data-calc]').innerHTML = `
    <h3 class="calc__title">${esc(k.title)}</h3>
    <div class="calc__fields">
      <div class="field"><span class="field__label">${esc(k.days)}</span>${stepper('days', 1, 45)}</div>
      <div class="field"><span class="field__label">${esc(k.adults)}</span>${stepper('adults', 1, 12)}</div>
      <div class="field field--wide"><span class="field__label">${esc(k.need)}</span>${choice('need', k.needs)}</div>
      <div class="field field--wide"><span class="field__label">${esc(k.goal)}</span>${choice('goal', k.goals)}</div>
    </div>
    <div class="calc__result" aria-live="polite">
      <p class="calc__rec">${esc(k.recommend)}</p>
      <p class="calc__name">${esc(res.name)} · ${esc(res.term)}</p>
      <p class="calc__price">${res.label}</p>
      ${res.extra ? `<p class="calc__extra">${esc(res.extra)}</p>` : ''}
      <button class="btn btn--light" type="button" data-calc-add>${inPlan ? esc(k.added) : esc(k.add)}</button>
    </div>`;
}

function setRider(id, d, adults) {
  S.rider = { id, days: d, adults };
  save();
  renderRiders();
  updateDock();
  toast(C.toasts.riderAdded);
  if ($('#planSheet').open) renderPlan();
}

/* ——— Выгода, вопросы, подвал ——— */
function renderStatic() {
  $('[data-benefits]').innerHTML = R.benefitsHtml(C);
  $('[data-faq]').innerHTML = R.faqHtml(C);
  $('[data-how]').innerHTML = R.howHtml(C);
  $('[data-why]').innerHTML = R.whyHtml(C);
  $('[data-concierge]').innerHTML = R.conciergeHtml(C);
  const c = C.contacts;
  $('[data-footlinks]').innerHTML = [
    [c.siteUrl, c.site], [`https://t.me/${c.telegram}`, `Telegram @${c.telegram}`],
    [`https://t.me/${c.channel}`, `Канал t.me/${c.channel}`], [`tel:${c.phone}`, c.phoneLabel],
  ].map(([h, t]) => `<li><a href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(t)}</a></li>`).join('');
  $$('[data-t]').forEach((el) => { const v = get(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
  $$('[data-ui]').forEach((el) => { el.innerHTML = UI[el.dataset.ui]; });
  ['how', 'quiz', 'catalog', 'routes', 'seasons', 'why', 'benefits', 'faq'].forEach((k) => { const el = $(`[data-head="${k}"]`); if (el) el.innerHTML = head(k); });
  $$('[data-logo]').forEach((el) => { el.innerHTML = logoSvg; });
}

/* ——— План ——— */
function planSummary() {
  const d = S.plan.length;
  const parts = [];
  if (d) parts.push(days(d));
  const total = planTotal();
  if (exItems().length && total != null) parts.push(usd(total));
  if (S.rider) parts.push(C.riders.items.find((r) => r.id === S.rider.id).name);
  return parts.join(' · ');
}

function updateDock() {
  const has = S.plan.length || S.rider;
  $('[data-open-plan]').hidden = !has;
  $('[data-dock-summary]').textContent = has ? planSummary() : '';
  const n = $('[data-trip-count]');
  if (n) { n.textContent = S.plan.length || ''; n.hidden = !S.plan.length; }
  measureDock();
}

function renderPlan() {
  const box = $('[data-plan]');
  const total = planTotal();
  const hours = exItems().reduce((h, i) => h + (exById(i.id).hours || 0), 0);
  const last = S.plan.length - 1;
  const move = (i) => `<span class="plan-item__move">
      <button class="icon-btn" type="button" data-move="${i}" data-d="-1" aria-label="Раньше" ${i === 0 ? 'disabled' : ''}>${UI.up}</button>
      <button class="icon-btn" type="button" data-move="${i}" data-d="1" aria-label="Позже" ${i === last ? 'disabled' : ''}>${UI.down}</button></span>`;
  const items = S.plan.map((item, i) => {
    if (isFree(item)) {
      return `<li class="plan-item plan-item--free"><span class="plan-item__day">${esc(C.plan.day)} ${i + 1}</span>
        <div><div class="plan-item__name">${esc(C.plan.freeDay)}</div><div class="plan-item__sub">${esc(C.quiz.dayFree)}</div></div>
        <div class="plan-item__right">${move(i)}<button class="icon-btn" type="button" data-remove-i="${i}" aria-label="Убрать свободный день">${UI.close}</button></div></li>`;
    }
    const ex = exById(item.id);
    const pr = exPrice(ex, item);
    const heli = ex.perPerson && S.group !== 'l' ? `<div class="stepper" aria-label="${esc(C.plan.heliPeople)}">
        <button type="button" data-heli="-1" aria-label="Меньше" ${heliPeople(item) <= 1 ? 'disabled' : ''}>${UI.minus}</button>
        <output>${heliPeople(item)}</output>
        <button type="button" data-heli="1" aria-label="Больше" ${heliPeople(item) >= 6 ? 'disabled' : ''}>${UI.plus}</button></div>` : '';
    return `<li class="plan-item">
      <span class="plan-item__day">${esc(C.plan.day)} ${i + 1}</span>
      <div><div class="plan-item__name">${esc(ex.name)}</div>
        <div class="plan-item__sub">${esc(R.hoursText(ex.hours))} · ${esc(S.group === 'l' ? C.plan.individual : usd(pr.value))}${ex.perPerson ? ` · ${esc(C.plan.heliPeople.toLowerCase())}` : ''}</div>${heli}</div>
      <div class="plan-item__right">${move(i)}<button class="icon-btn" type="button" data-remove-i="${i}" aria-label="Убрать ${esc(ex.name)}">${UI.close}</button></div>
    </li>`;
  }).join('');
  let rider = '';
  if (S.rider) {
    const r = riderCalc(S.rider.id, S.rider.days, S.rider.adults);
    rider = `<div class="plan-rider"><div><div class="plan-item__name">+ ${esc(r.name)}</div><div class="plan-item__sub">${esc(r.term)} · ${r.label}${r.extra ? ` · ${esc(r.extra)}` : ''}</div></div>
      <button class="icon-btn" type="button" data-remove-rider aria-label="Убрать райдер">${UI.close}</button></div>`;
  }
  const empty = !S.plan.length && !S.rider;
  const ex = exItems().length;
  box.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="plan-h">${esc(C.plan.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <div class="seg" role="radiogroup" aria-label="Размер группы">${Object.entries(C.groups).map(([k, g]) =>
      `<button type="button" role="radio" aria-checked="${S.group === k}" data-group="${k}">${esc(g.short)}</button>`).join('')}</div>
    ${empty ? `<p class="plan-empty">${esc(C.plan.empty)}</p>` : `<ol class="plan-list">${items}</ol>${rider}`}
    ${ex ? `<div class="plan-total">
      <div class="plan-total__facts"><span><b>${days(S.plan.length)}</b></span><span><b>${ex}</b> ${plural(ex, ['экскурсия', 'экскурсии', 'экскурсий'])}</span><span><b>≈${hours}</b> ч в пути и на месте</span></div>
      <div class="plan-total__sum"><span>${esc(C.plan.total)}${total == null ? '' : `, за группу ${esc(C.groups[S.group].short)}, ${esc(C.plan.totalNote)}`}</span>
      <b>${esc(total == null ? C.plan.individual : usd(total))}</b></div></div>` : ''}
    ${ex >= 2 && !S.rider ? `<div class="note"><p>${esc(C.plan.riderHint)}</p><a class="link-arrow" href="#riders" data-close-go>${esc(C.plan.riderLink)}</a></div>` : ''}
    <div class="plan-actions">
      <button class="btn btn--main btn--block" type="button" data-open-lead>${esc(C.plan.send)}</button>
      ${empty ? '' : `<button class="btn btn--ghost btn--block" type="button" data-share>${UI.link}<span>${esc(C.plan.share)}</span></button>`}
    </div>`;
}

function shareUrl() {
  const p = new URLSearchParams();
  if (S.plan.length) p.set('plan', S.plan.map((i) => (i.people ? `${i.id}*${i.people}` : i.id)).join(','));
  p.set('g', S.group);
  if (S.rider) p.set('r', `${S.rider.id}.${S.rider.days}.${S.rider.adults}`);
  if (S.month != null) p.set('m', S.month);
  return `${location.origin}${location.pathname}#${p}`;
}
function readShared() {
  if (!location.hash.includes('plan=') && !location.hash.includes('r=')) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  const plan = (p.get('plan') || '').split(',').filter(Boolean).map((x) => {
    const [id, people] = x.split('*');
    return people ? { id, people: Math.min(6, Math.max(1, +people || 2)) } : { id };
  }).filter((x) => exById(x.id));
  S.plan = plan;
  if (C.groups[p.get('g')]) S.group = p.get('g');
  const r = (p.get('r') || '').split('.');
  if (C.riders.items.some((x) => x.id === r[0])) S.rider = { id: r[0], days: +r[1] || 7, adults: +r[2] || 2 };
  if (p.has('m')) S.month = Math.min(11, Math.max(0, +p.get('m')));
  save();
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

/* ——— Заявка ——— */
function giftBonus() {
  const q = S.quiz || {};
  const when = {
    kids: q.who === 'kids',
    long: q.days === 'd5',
    wine: (q.likes || []).includes('wine'),
    height: (q.likes || []).includes('height'),
    default: true,
  };
  return C.gift.bonuses.find((b) => when[b.when]);
}

function buildMessage(monthIdx) {
  const m = C.messages;
  const q = S.quiz || {};
  const mo = monthIdx != null ? C.seasons.months[monthIdx] : null;
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const lines = [`${m.hello}${mo ? ` ${mo.in}` : ''}.`];
  const who = [q.who && m.who[q.who], q.who !== 'solo' && (exItems().length || q.who) ? m.group[S.group] : ''].filter(Boolean).join(', ');
  if (who) lines.push(`${cap(who)}.`);
  if (leadMode === 'concierge') lines.push(m.concierge);
  if (exItems().length) {
    lines.push('', m.route);
    S.plan.forEach((item, i) => {
      if (isFree(item)) { lines.push(`${i + 1}. ${m.free}`); return; }
      const ex = exById(item.id);
      const extra = ex.perPerson && S.group !== 'l' ? ` (${heliPeople(item)} ${plural(heliPeople(item), ['человек', 'человека', 'человек'])})` : '';
      lines.push(`${i + 1}. ${ex.name}${extra}`);
    });
    const total = planTotal();
    if (total != null) lines.push(m.sum.replace('{sum}', usd(total)));
    lines.push('');
  }
  if (S.rider) {
    const r = riderCalc(S.rider.id, S.rider.days, S.rider.adults);
    const what = S.rider.id === 'standard' ? `${r.name} (${r.term})` : `${r.name} на ${days(S.rider.days)}`;
    lines.push((exItems().length ? m.rider : m.riderOnly).replace('{rider}', what));
  }
  if (!exItems().length && !S.rider && leadMode !== 'concierge') lines.push(m.nothing);
  else lines.push(m.ask);
  const gift = giftBonus();
  if (gift) lines.push(m.gift.replace('{gift}', gift.message));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

let leadMonth = null;
function renderLead() {
  const L = C.lead;
  const form = $('[data-lead]');
  leadMonth = S.month;
  const summary = planSummary();
  form.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="lead-h">${esc(L.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <p class="lead__text">${esc(L.lead)}</p>
    ${summary ? `<p class="lead__summary">${UI.trip}<span>${esc(summary)}</span></p>` : ''}
    <div class="field"><span class="field__label">${esc(L.when)} <small>${esc(L.whenHint)}</small></span>
      <div class="months months--lead" role="radiogroup">${C.seasons.months.map((mo, i) =>
        `<button class="chip" type="button" role="radio" aria-checked="${leadMonth === i}" data-leadmonth="${i}">${esc(mo.short)}</button>`).join('')}</div></div>
    <div class="send">${L.channels.map((c, i) =>
      `<button class="btn ${i ? 'btn--ghost' : 'btn--main'} btn--block send__btn" type="button" data-send="${c.id}">${UI[c.id === 'tg' ? 'telegram' : 'whatsapp']}<span>${esc(c.text)}</span>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</button>`).join('')}</div>
    <p class="lead__call">${esc(L.call)}: <a href="tel:${esc(C.contacts.phone)}" data-send-call>${esc(C.contacts.phoneLabel)}</a></p>
    <details class="lead__preview"><summary>${esc(L.preview)} ${UI.down}</summary><p class="preview" data-preview></p></details>
    <p class="consent">${esc(L.consent)} — <a href="${esc(C.contacts.consentUrl)}" target="_blank" rel="noopener">условия</a>.</p>
    <p class="hours">${esc(C.contacts.hours)}</p>`;
  updatePreview();
}
function updatePreview() {
  const el = $('[data-preview]');
  if (el) el.textContent = buildMessage(leadMonth);
}

function sendLead(channel) {
  const text = buildMessage(leadMonth);
  const enc = encodeURIComponent(text);
  const c = C.contacts;
  const url = { tg: `https://t.me/${c.telegram}?text=${enc}`, wa: `https://wa.me/${c.whatsapp}?text=${enc}`, call: `tel:${c.phone}` }[channel];
  reach({ tg: 'lead_tg', wa: 'lead_wa', call: 'lead_call' }[channel]);
  logEvent('Заявка', { 'Канал': { tg: 'Telegram', wa: 'WhatsApp', call: 'Звонок' }[channel], 'Месяц': leadMonth != null ? C.seasons.months[leadMonth].name : '' });
  if (channel !== 'call') navigator.clipboard?.writeText(text).catch(() => {});
  window.__lastLead = { url, text }; // для автотеста
  if (channel !== 'call') {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
  }
  closeSheet($('#leadSheet'));
  openGift(leadMonth);
  if (channel !== 'call') setTimeout(() => toast(C.lead.copied), 900);
}

/* ——— Подарок ——— */
async function openGift(monthIdx) {
  const box = $('[data-gift]');
  const G = C.gift;
  const bonus = giftBonus();
  box.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="gift-h">${esc(G.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <p class="muted" style="margin:0">${esc(G.lead)}</p>
    ${bonus ? `<a class="giftbox" href="${esc(bonus.file)}" download target="_blank" rel="noopener" data-gift-file>
      <img class="giftbox__cover" src="${esc(bonus.file.replace('.pdf', '.jpg'))}" alt="" width="560" height="794">
      <span class="giftbox__label">Ваш подарок</span><b>${esc(bonus.title)}</b><span class="giftbox__cta">${UI.download}${esc(G.download)} · PDF</span></a>` : ''}
    <img class="gift-img" alt="Открытка с Вашим маршрутом" data-gift-img>
    <div class="gift-actions"><button class="btn btn--ghost btn--block" type="button" data-gift-save disabled>${UI.download}<span>${esc(G.save)}</span></button></div>`;
  openSheet($('#giftSheet'));
  const mo = monthIdx != null ? C.seasons.months[monthIdx] : null;
  const q = S.quiz || {};
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const who = [q.who && C.messages.who[q.who], q.who !== 'solo' ? C.messages.group[S.group].split(' — ')[0] : ''].filter(Boolean).join(', ');
  const total = planTotal();
  const r = S.rider ? riderCalc(S.rider.id, S.rider.days, S.rider.adults) : null;
  const blob = await drawGift({
    logoSvg,
    title: G.helloNoName,
    who: cap(`${who || 'Ваша поездка'}${mo ? ` · ${mo.name}` : ''}`),
    routeTitle: G.routeTitle,
    route: S.plan.map((i) => (isFree(i) ? C.plan.freeDay : exById(i.id).name)),
    rider: r ? `${r.name} · ${r.term}` : '',
    total: exItems().length && total != null ? G.total.replace('{sum}', usd(total)) : '',
    seasonTitle: G.seasonTitle,
    season: mo?.card || '',
    gift: bonus ? G.giftLine.replace('{gift}', bonus.message) : '',
    giftNote: G.giftNote,
    contacts: C.contacts,
  });
  const img = $('[data-gift-img]', box);
  img.src = URL.createObjectURL(blob);
  const btn = $('[data-gift-save]', box);
  btn.disabled = false;
  btn.onclick = async () => {
    reach('gift_save');
    const file = new File([blob], 'topriders-los-angeles.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: G.title }); return; } catch { /* отмена */ }
    }
    const a = document.createElement('a');
    a.href = img.src; a.download = file.name; a.click();
  };
}

/* ——— Логи в Google Таблицу (без имени и контактов) ——— */
function utm() {
  try {
    const p = new URLSearchParams(location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign'];
    if (keys.some((k) => p.has(k))) sessionStorage.setItem('tr-utm', keys.map((k) => p.get(k) || '').join(' / '));
    return sessionStorage.getItem('tr-utm') || '';
  } catch { return ''; }
}
function logEvent(event, extra = {}) {
  const ep = C.leads?.endpoint;
  const q = S.quiz || {};
  const opt = (qi, id) => C.quiz.questions[qi].options.find((o) => o.id === id)?.text || '';
  const payload = {
    'Событие': event,
    'С кем': opt(0, q.who),
    'Дней': opt(1, q.days),
    'Интересы': (q.likes || []).map((id) => opt(2, id)).join(', '),
    'Группа': C.groups[S.group].short,
    'Подобрано': (S.picked || []).map((id) => exById(id)?.name).join(', '),
    'План': S.plan.map((i) => (isFree(i) ? 'свободный день' : exById(i.id).name)).join(', '),
    'Режим': leadMode === 'concierge' ? 'под ключ' : 'сам',
    'Сумма': planTotal() ?? '',
    'Райдер': S.rider ? `${S.rider.id} · ${S.rider.days} дн · ${S.rider.adults} взр` : '',
    'UTM': utm(),
    'Страница': location.pathname,
    ...extra,
  };
  if (debug) console.log('[sheet]', JSON.stringify(payload));
  if (!ep) return;
  fetch(ep, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
}

/* ——— Шторки ——— */
function openSheet(d) {
  if (!d.open) d.showModal();
  document.documentElement.style.overflow = 'hidden';
}
function closeSheet(d) {
  if (d.open) d.close();
}
function measureDock() {
  const dock = $('[data-dock]');
  const mobile = matchMedia('(max-width: 959px)').matches;
  const h = dock.classList.contains('is-shown') && mobile ? dock.offsetHeight : 0;
  document.documentElement.style.setProperty('--dock-h', `${h}px`);
}

/* ——— События ——— */
function bind() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) {
      const d = e.target.closest('dialog');
      if (d && e.target === d) closeSheet(d); // клик по фону
      return;
    }
    const ds = t.dataset;
    if ('start' in ds || 'qstart' in ds) {
      if ('start' in ds) e.preventDefault();
      if ('qstart' in ds || Q.screen !== 'q') { Q.screen = 'q'; Q.idx = 0; Q.answers = { likes: [] }; swap(renderQuiz); }
      $('#quiz').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      setTimeout(() => $('[data-opt]')?.focus({ preventScroll: true }), 400);
    }
    else if (ds.opt) answer(ds.opt);
    else if ('qnext' in ds) next();
    else if ('qback' in ds) back();
    else if ('qrestart' in ds) { Q.screen = 'q'; Q.idx = 0; Q.answers = { likes: [] }; swap(renderQuiz); }
    else if (ds.add) toggleExcursion(ds.add);
    else if ('resultSend' in ds) { takeResult(); leadMode = 'plan'; renderLead(); openSheet($('#leadSheet')); }
    else if ('resultKeep' in ds) { takeResult(); toast(C.toasts.routeAdded); renderPlan(); openSheet($('#planSheet')); reach('plan_open'); }
    else if (ds.route) addRoute(C.routes.items.find((r) => r.id === ds.route));
    else if (ds.view) { view = ds.view; renderViewSeg(); renderCatalog(); if (view === 'map') reach('map_open'); }
    else if (ds.mapfocus) { mapFocus = mapFocus === ds.mapfocus ? null : ds.mapfocus; renderMap(); }
    else if (ds.compare) toggleCompare(ds.compare);
    else if ('openCmp' in ds) { renderCompare(); openSheet($('#cmpSheet')); reach('compare_open'); }
    else if ('cmpClear' in ds) { S.compare = []; save(); renderCatalog(); }
    else if (ds.move) {
      const i = +ds.move; const j = i + +ds.d;
      [S.plan[i], S.plan[j]] = [S.plan[j], S.plan[i]];
      save(); renderPlan(); refreshCards();
    }
    else if (ds.removeI) { S.plan.splice(+ds.removeI, 1); save(); renderPlan(); refreshCards(); }
    else if (ds.group) { S.group = ds.group; save(); renderGroupSeg(); refreshCards(); if ($('#planSheet').open) renderPlan(); }
    else if (ds.filter) { filter = ds.filter; renderFilters(); renderCatalog(); }
    else if (ds.month != null && ds.month !== undefined && t.closest('[data-months]')) {
      const m = +ds.month; S.month = S.month === m ? null : m; save(); renderSeasons();
    }
    else if (ds.cur) { S.currency = ds.cur; save(); renderRiders(); if ($('#planSheet').open) renderPlan(); }
    else if (ds.pkg) { S.travelPkg = +ds.pkg; save(); renderRiders(); }
    else if (ds.riderAdd) {
      const id = ds.riderAdd;
      if (S.rider?.id === id) { S.rider = null; save(); renderRiders(); updateDock(); return; }
      const d = id === 'travel' ? S.travelPkg : id === 'top' ? 14 : S.calc.days;
      setRider(id, d, S.calc.adults);
    }
    else if (ds.step) {
      const lim = { days: [1, 45], adults: [1, 12] }[ds.step];
      S.calc[ds.step] = Math.min(lim[1], Math.max(lim[0], S.calc[ds.step] + +ds.d));
      save(); renderCalc(); reach('rider_calc');
    }
    else if (ds.calc) { S.calc[ds.calc] = ds.v; save(); renderCalc(); reach('rider_calc'); }
    else if ('calcAdd' in ds) setRider(recommend(), S.calc.days, S.calc.adults);
    else if ('openPlan' in ds || 'openPlanTop' in ds) { renderPlan(); openSheet($('#planSheet')); reach('plan_open'); }
    else if ('openLead' in ds) { leadMode = ds.openLead === 'concierge' ? 'concierge' : 'plan'; closeSheet($('#planSheet')); renderLead(); openSheet($('#leadSheet')); }
    else if ('close' in ds) closeSheet(t.closest('dialog'));
    else if ('closeGo' in ds) closeSheet(t.closest('dialog'));
    else if (ds.remove) toggleExcursion(ds.remove);
    else if ('removeRider' in ds) { S.rider = null; save(); renderRiders(); updateDock(); renderPlan(); }
    else if (ds.heli) {
      const item = S.plan.find((p) => p.id === 'heli');
      item.people = Math.min(6, Math.max(1, heliPeople(item) + +ds.heli));
      save(); renderPlan(); updateDock();
    }
    else if ('share' in ds) {
      const url = shareUrl();
      (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast(C.plan.shared)).catch(() => prompt('Ссылка на план', url));
    }
    else if (ds.send) sendLead(ds.send);
    else if ('sendCall' in ds) sendLead('call');
    else if (ds.leadmonth != null && t.closest('[data-lead]')) {
      const m = +ds.leadmonth; leadMonth = leadMonth === m ? null : m;
      $$('[data-leadmonth]').forEach((b) => b.setAttribute('aria-checked', +b.dataset.leadmonth === leadMonth)); updatePreview();
    }
    else if ('giftFile' in ds) reach('gift_download');
  });

  $('[data-lead]').addEventListener('submit', (e) => e.preventDefault());
  $$('dialog').forEach((d) => d.addEventListener('close', () => {
    if (!$$('dialog').some((x) => x.open)) document.documentElement.style.overflow = '';
  }));

  // Панель внизу — после первого экрана
  const dock = $('[data-dock]');
  dock.hidden = false;
  new IntersectionObserver(([en]) => {
    dock.classList.toggle('is-shown', !en.isIntersecting);
    measureDock();
  }, { rootMargin: '-40% 0px 0px 0px' }).observe($('.hero'));
  const top = $('.top');
  addEventListener('scroll', () => top.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
  addEventListener('resize', measureDock, { passive: true });
}

function metrika() {
  const id = C.analytics?.metrikaId;
  if (!id) return;
  /* eslint-disable */
  (function (m, e, t, r, i, k, a) { m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date(); k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a); })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
}

async function init() {
  const [cfg, logo] = await Promise.all([
    fetch(`config.json?v=${VERSION}`, { cache: 'no-cache' }).then((r) => r.json()),
    fetch(`assets/logo-word.svg?v=${VERSION}`).then((r) => r.text()).catch(() => ''),
  ]);
  C = cfg;
  logoSvg = logo.replace('<svg ', '<svg role="img" aria-label="TOP RIDERS" ');
  restore();
  const shared = readShared();
  utm();
  renderStatic();
  renderQuiz();
  renderGroupSeg();
  renderViewSeg();
  renderFilters();
  renderCatalog();
  renderSeasons();
  renderRiders();
  bind();
  updateDock();
  metrika();
  if (shared) { renderPlan(); openSheet($('#planSheet')); }
  document.documentElement.dataset.ready = '1';
}

init().catch((err) => {
  console.error(err);
  $('[data-quiz]').innerHTML = '<p>Не получилось загрузить данные. Обновите страницу или напишите нам в Telegram: <a href="https://t.me/TopRiders_Travel">@TopRiders_Travel</a></p>';
});
