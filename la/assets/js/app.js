// TOP RIDERS · Лос-Анджелес. Все тексты и цены — в config.json.
import { ILLUSTRATIONS, UI } from './icons.js?v=2';
import { drawGift } from './gift.js?v=2';

const VERSION = '2';
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
  quiz: null,     // { who, days, likes:[], people }
  picked: [],
};
const Q = { screen: 'q', idx: 0, answers: { likes: [] } };
let quizStarted = false;
let filter = 'all';
let leadName = '';

/* ——— Утилиты ——— */
const get = (path) => path.split('.').reduce((o, k) => o?.[k], C);
const nf = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const usd = (n) => `$${nf(n)}`;
const rub = (n) => `${nf(n)} ₽`;
const money = (v) => (S.currency === 'rub' ? rub(v.rub) : `${nf(v.usd)} $`);
const plural = (n, f) => f[(n % 100 > 4 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
const days = (n) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
const tile = (icon, cls = '') => `<span class="tile ${cls}">${ILLUSTRATIONS[icon] || ''}</span>`;
const exById = (id) => C.excursions.find((e) => e.id === id);

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* приватный режим */ }
}
function restore() {
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch { /* пусто */ }
  S.plan = (S.plan || []).filter((p) => exById(p.id));
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
// Цена экскурсии для текущей группы: { value, label, note }
function exPrice(ex, item) {
  if (S.group === 'l') return { value: null, label: C.plan.individual, note: '' };
  if (ex.perPerson) {
    if (item) { const n = heliPeople(item); return { value: ex.perPerson * n, label: `от ${usd(ex.perPerson * n)}`, note: `${n} ${plural(n, ['человек', 'человека', 'человек'])}` }; }
    return { value: ex.perPerson, label: `от ${usd(ex.perPerson)}`, note: 'на человека' };
  }
  const v = ex.price[S.group];
  return { value: v, label: `от ${usd(v)}`, note: `за группу ${C.groups[S.group].short}` };
}
function planTotal() {
  if (S.group === 'l') return null;
  return S.plan.reduce((sum, item) => sum + (exPrice(exById(item.id), item).value || 0), 0);
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

/* ——— Заголовки разделов ——— */
function head(key) {
  const h = C[key];
  return `<div class="sec-head__num"><b>${esc(h.num)}</b>${esc(h.label)}</div>
    <h2 class="h2" id="${key}-h"><b>${esc(h.titleBold)}</b> <span>${esc(h.titleLight)}</span></h2>
    ${h.lead ? `<p>${esc(h.lead)}</p>` : ''}`;
}

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
  const qWho = C.quiz.questions[0];
  const qDays = C.quiz.questions[1];
  const qLikes = C.quiz.questions[2];
  const who = qWho.options.find((o) => o.id === Q.answers.who);
  const dayOpt = qDays.options.find((o) => o.id === Q.answers.days) || qDays.options[1];
  const likes = (Q.answers.likes || []).map((id) => qLikes.options.find((o) => o.id === id));
  const kids = Q.answers.who === 'kids';
  const count = dayOpt.count;

  let ids;
  if (!likes.length || likes.some((o) => o.exclusive)) {
    ids = kids ? [...C.quiz.kidsFirst] : [...C.quiz.popular];
  } else {
    const likeTags = new Set(likes.flatMap((o) => o.tags));
    const scored = C.excursions.map((ex, i) => {
      let s = ex.tags.filter((t) => likeTags.has(t)).length * 3;
      if (who?.tags?.some((t) => ex.tags.includes(t))) s += 1.5;
      if (kids && C.quiz.kidsFirst.includes(ex.id)) s += 4;
      return { id: ex.id, s: s - i * 0.01 };
    }).sort((a, b) => b.s - a.s);
    ids = scored.map((x) => x.id);
  }
  return ids.slice(0, count);
}

function reasonFor(ex) {
  const qLikes = C.quiz.questions[2];
  const parts = (Q.answers.likes || [])
    .map((id) => qLikes.options.find((o) => o.id === id))
    .filter((o) => o && !o.exclusive && o.tags.some((t) => ex.tags.includes(t)))
    .map((o) => o.text.toLowerCase());
  if (Q.answers.who === 'kids' && ex.tags.includes('дети')) parts.push('с детьми');
  return parts.length ? `${C.quiz.reasonPrefix} ${parts.join(' · ')}` : '';
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

function card(ex, { reason = '' } = {}) {
  const inPlan = S.plan.some((p) => p.id === ex.id);
  const pr = exPrice(ex);
  return `<article class="card ${inPlan ? 'is-added' : ''}" data-card="${ex.id}">
    <div class="card__head">
      <span class="card__art">${tile(ex.icon)}</span>
      <div>
        <h3 class="h3">${esc(ex.name)}</h3>
        <div class="card__meta">${esc(ex.duration)}</div>
      </div>
    </div>
    ${reason ? `<p class="card__reason">${esc(reason)}</p>` : ''}
    <div class="card__price">${esc(pr.label)}${pr.note ? `<small>${esc(pr.note)}</small>` : ''}</div>
    <ul class="card__points">${ex.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <details class="more">
      <summary>Подробнее ${UI.down}</summary>
      <p>${esc(ex.about)}</p>
      ${ex.terms ? `<p class="term">${esc(ex.terms)}</p>` : ''}
      ${ex.season ? `<p class="when"><b>Когда лучше:</b> ${esc(ex.season)}</p>` : ''}
    </details>
    <div class="card__foot">${addBtn(ex.id, inPlan)}</div>
  </article>`;
}
const addBtn = (id, on) => `<button class="btn btn--main add ${on ? 'is-on' : ''}" type="button" data-add="${id}" aria-pressed="${on}">
  ${on ? `${UI.check}<span>В плане</span>` : `${UI.plus}<span>Добавить в план</span>`}</button>`;

function renderResult(box) {
  const kidsLong = S.quiz?.days === 'd5';
  box.innerHTML = `
    <h3 class="result__title">${esc(C.quiz.resultTitle)}</h3>
    <p class="result__lead">${esc(C.quiz.resultLead)}</p>
    <div class="result__grid">${S.picked.map((id) => card(exById(id), { reason: reasonFor(exById(id)) })).join('')}</div>
    ${kidsLong ? `<div class="note"><p>${esc(C.quiz.longNote)}</p><a class="link-arrow" href="#riders">${esc(C.quiz.longLink)}</a></div>` : ''}
    <div class="result__actions">
      <a class="link-arrow" href="#catalog">${esc(C.quiz.toCatalog)}</a>
      <button class="quiz__back" type="button" data-qrestart>${esc(C.quiz.restart)}</button>
    </div>`;
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
  const list = C.excursions.filter((ex) => filter === 'all' || ex.filters.includes(filter));
  $('[data-grid]').innerHTML = list.map((ex) => card(ex)).join('');
  if (Q.screen === 'result') renderQuiz();
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
      <div class="rider__foot"><button class="btn btn--ghost" type="button" data-rider-add="${r.id}">${inPlan ? `${UI.check} В плане` : 'Добавить в план'}</button></div>
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
  const b = C.benefits;
  $('[data-benefits]').innerHTML = `
    <div class="visa"><div class="visa__big">${esc(b.visaBig)}</div><h3 class="visa__title">${esc(b.visaTitle)}</h3><p>${esc(b.visaText)}</p></div>
    <div class="loyal"><h3 class="loyal__title">${esc(b.loyaltyTitle)}</h3>
      <div class="loyal__row">${b.loyalty.map((l) => `<div><b>${esc(l.off)}</b><span>${esc(l.trips)}</span></div>`).join('')}</div></div>`;
  $('[data-faq]').innerHTML = C.faq.items.map((f) => `<details><summary>${esc(f.q)}${UI.plus}</summary><p>${esc(f.a)}</p></details>`).join('');
  const c = C.contacts;
  $('[data-footlinks]').innerHTML = [
    [c.siteUrl, c.site], [`https://t.me/${c.telegram}`, `Telegram @${c.telegram}`],
    [`https://t.me/${c.channel}`, `Канал t.me/${c.channel}`], [`tel:${c.phone}`, c.phoneLabel],
  ].map(([h, t]) => `<li><a href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(t)}</a></li>`).join('');
  $('[data-trust]').innerHTML = C.hero.trust.map((t) => `<li>${esc(t)}</li>`).join('');
  $$('[data-t]').forEach((el) => { const v = get(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
  $$('[data-ui]').forEach((el) => { el.innerHTML = UI[el.dataset.ui]; });
  ['quiz', 'catalog', 'seasons', 'riders', 'benefits', 'faq'].forEach((k) => { $(`[data-head="${k}"]`).innerHTML = head(k); });
  $$('[data-logo]').forEach((el) => { el.innerHTML = logoSvg; });
}

/* ——— План ——— */
function planSummary() {
  const n = S.plan.length;
  const parts = [];
  if (n) parts.push(`${n} ${plural(n, ['экскурсия', 'экскурсии', 'экскурсий'])}`);
  const total = planTotal();
  if (n && total != null) parts.push(usd(total));
  if (S.rider) parts.push(C.riders.items.find((r) => r.id === S.rider.id).name);
  return parts.join(' · ');
}

function updateDock() {
  const has = S.plan.length || S.rider;
  $('[data-open-plan]').hidden = !has;
  $('[data-dock-summary]').textContent = has ? `· ${planSummary()}` : '';
  measureDock();
}

function renderPlan() {
  const box = $('[data-plan]');
  const total = planTotal();
  const items = S.plan.map((item) => {
    const ex = exById(item.id);
    const pr = exPrice(ex, item);
    const heli = ex.perPerson && S.group !== 'l' ? `<div class="stepper" aria-label="${esc(C.plan.heliPeople)}">
        <button type="button" data-heli="-1" aria-label="Меньше" ${heliPeople(item) <= 1 ? 'disabled' : ''}>${UI.minus}</button>
        <output>${heliPeople(item)}</output>
        <button type="button" data-heli="1" aria-label="Больше" ${heliPeople(item) >= 6 ? 'disabled' : ''}>${UI.plus}</button></div>` : '';
    return `<li class="plan-item">
      <span class="plan-item__art">${tile(ex.icon)}</span>
      <div><div class="plan-item__name">${esc(ex.name)}</div>
        <div class="plan-item__sub">${esc(ex.perPerson ? C.plan.heliPeople : `группа ${C.groups[S.group].short}`)}</div>${heli}</div>
      <div class="plan-item__right"><span class="plan-item__price">${esc(S.group === 'l' ? '—' : usd(pr.value))}</span>
        <button class="icon-btn" type="button" data-remove="${ex.id}" aria-label="Убрать ${esc(ex.name)}">${UI.close}</button></div>
    </li>`;
  }).join('');
  let rider = '';
  if (S.rider) {
    const r = riderCalc(S.rider.id, S.rider.days, S.rider.adults);
    rider = `<li class="plan-item">
      <span class="plan-item__art">${tile('palms')}</span>
      <div><div class="plan-item__name">${esc(r.name)}</div><div class="plan-item__sub">${esc(r.term)}${r.extra ? ` · ${esc(r.extra)}` : ''}</div></div>
      <div class="plan-item__right"><span class="plan-item__price">${r.label}</span>
        <button class="icon-btn" type="button" data-remove-rider aria-label="Убрать райдер">${UI.close}</button></div></li>`;
  }
  const empty = !S.plan.length && !S.rider;
  box.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="plan-h">${esc(C.plan.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <div class="seg" role="radiogroup" aria-label="Размер группы">${Object.entries(C.groups).map(([k, g]) =>
      `<button type="button" role="radio" aria-checked="${S.group === k}" data-group="${k}">${esc(g.short)}</button>`).join('')}</div>
    ${empty ? `<p class="plan-empty">${esc(C.plan.empty)}</p>` : `<ul class="plan-list">${items}${rider}</ul>`}
    ${S.plan.length ? `<div class="plan-total"><span>${esc(C.plan.total)}<br>${esc(total == null ? '' : `за группу ${C.groups[S.group].short}, ${C.plan.totalNote}`)}</span>
      <b>${esc(total == null ? C.plan.individual : usd(total))}</b></div>` : ''}
    ${S.plan.length >= 2 && !S.rider ? `<div class="note"><p>${esc(C.plan.riderHint)}</p><a class="link-arrow" href="#riders" data-close-go>${esc(C.plan.riderLink)}</a></div>` : ''}
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

function buildMessage(name, dates) {
  const m = C.messages;
  const q = S.quiz || {};
  const lines = [];
  const mo = C.seasons.months.find((x) => x.name === dates.trim().toLowerCase());
  lines.push(`${m.hello}${mo ? `, примерно ${mo.in}` : ''}.`);
  if (dates.trim() && !mo) lines.push(`Даты: ${dates.trim()}.`);

  let people = q.who === 'solo' ? m.solo : C.groups[S.group].phrase;
  if (q.who === 'kids') people += `, ${m.kids}`;
  if (S.group === 'l') people += ` — ${m.large}`;
  if (S.plan.length || q.who) lines.push(`${people}.`);

  if (S.plan.length) {
    const names = S.plan.map((item) => {
      const ex = exById(item.id);
      return ex.perPerson && S.group !== 'l' ? `«${ex.name}» (${heliPeople(item)} ${plural(heliPeople(item), ['человек', 'человека', 'человек'])})` : `«${ex.name}»`;
    });
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} и ${names.at(-1)}` : names[0];
    const total = planTotal();
    lines.push(`${m.include} ${list}${total != null ? ` — ${m.sum.replace('{sum}', usd(total))}` : ''}.`);
  }
  if (S.rider) {
    const r = riderCalc(S.rider.id, S.rider.days, S.rider.adults);
    const what = S.rider.id === 'standard' ? `${r.name}, ${r.term}` : `${r.name} на ${days(S.rider.days)}, взрослых — ${S.rider.adults}`;
    lines.push(`${S.plan.length ? m.riderAlso : m.riderOnly} ${what}.`);
  }
  if (!S.plan.length && !S.rider) lines.push(m.nothing);
  const gift = giftBonus();
  if (gift) lines.push(m.gift.replace('{gift}', gift.message));
  lines.push(m.close);
  if (name.trim()) lines.push(m.name.replace('{name}', name.trim()));
  return lines.join('\n');
}

let channel = 'tg';
function renderLead() {
  const L = C.lead;
  const form = $('[data-lead]');
  const month = S.month != null ? C.seasons.months[S.month].name : '';
  form.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="lead-h">${esc(L.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <div class="form">
      <label class="field"><span class="field__label">${esc(L.name)}</span>
        <input class="input" name="name" autocomplete="given-name" required placeholder="${esc(L.namePh)}" value="${esc(leadName)}"></label>
      <p class="err" data-err hidden>${esc(L.nameError)}</p>
      <label class="field"><span class="field__label">${esc(L.dates)}</span>
        <input class="input" name="dates" placeholder="${esc(L.datesPh)}" value="${esc(month)}"></label>
      <div class="field"><span class="field__label">${esc(L.channel)}</span>
        <div class="channels" role="radiogroup">${L.channels.map((c) =>
          `<button class="opt" type="button" role="radio" aria-checked="${channel === c.id}" data-channel="${c.id}">${UI[{ tg: 'telegram', wa: 'whatsapp', call: 'phone' }[c.id]]}<span>${esc(c.text)}</span></button>`).join('')}</div></div>
      <div class="field"><span class="field__label">${esc(L.preview)}</span><p class="preview" data-preview></p></div>
      <button class="btn btn--main btn--block" type="submit" data-submit>${esc(L.submit[channel])}</button>
      <p class="consent">${esc(L.consent)} — <a href="${esc(C.contacts.consentUrl)}" target="_blank" rel="noopener">условия</a>.</p>
      <p class="hours">${esc(C.contacts.hours)}</p>
    </div>`;
  updatePreview();
}
function updatePreview() {
  const f = $('[data-lead]');
  $('[data-preview]', f).textContent = buildMessage(f.name.value, f.dates.value);
  $('[data-submit]', f).textContent = C.lead.submit[channel];
}

async function submitLead(e) {
  e.preventDefault();
  const f = $('[data-lead]');
  const name = f.name.value.trim();
  if (!name) {
    f.name.setAttribute('aria-invalid', 'true');
    $('[data-err]', f).hidden = false;
    f.name.focus();
    return;
  }
  leadName = name;
  const text = buildMessage(name, f.dates.value);
  const enc = encodeURIComponent(text);
  const c = C.contacts;
  const url = { tg: `https://t.me/${c.telegram}?text=${enc}`, wa: `https://wa.me/${c.whatsapp}?text=${enc}`, call: `tel:${c.phone}` }[channel];
  reach({ tg: 'lead_tg', wa: 'lead_wa', call: 'lead_call' }[channel]);
  logEvent('Заявка', { 'Канал': C.lead.channels.find((x) => x.id === channel).text, 'Месяц': f.dates.value.trim() });
  if (channel !== 'call') navigator.clipboard?.writeText(text).catch(() => {});
  window.__lastLead = { url, text }; // для автотеста
  const a = document.createElement('a');
  a.href = url;
  if (channel !== 'call') { a.target = '_blank'; a.rel = 'noopener'; }
  document.body.append(a); a.click(); a.remove();
  closeSheet($('#leadSheet'));
  openGift(name, f.dates.value.trim());
  if (channel !== 'call') setTimeout(() => toast(C.lead.copied), 900);
}

/* ——— Подарок ——— */
async function openGift(name, dates) {
  const box = $('[data-gift]');
  const G = C.gift;
  box.innerHTML = `
    <div class="sheet__head"><h2 class="sheet__title" id="gift-h">${esc(G.title)}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${UI.close}</button></div>
    <p class="muted" style="margin:0">${esc(G.lead)}</p>
    <img class="gift-img" alt="Открытка с Вашим маршрутом" data-gift-img>
    <div class="gift-actions"><button class="btn btn--main btn--block" type="button" data-gift-save disabled>${UI.download}<span>${esc(G.save)}</span></button></div>`;
  openSheet($('#giftSheet'));
  const mo = C.seasons.months.find((x) => x.name === dates.toLowerCase()) || (S.month != null ? C.seasons.months[S.month] : null);
  const q = S.quiz || {};
  const who = q.who === 'solo' ? 'Поездка для одного' : `${C.groups[S.group].phrase}${q.who === 'kids' ? ', с детьми' : ''}`;
  const total = planTotal();
  const r = S.rider ? riderCalc(S.rider.id, S.rider.days, S.rider.adults) : null;
  const bonus = giftBonus();
  const blob = await drawGift({
    logoSvg,
    title: name ? G.hello.replace('{name}', name) : G.helloNoName,
    who: `${who}${mo ? ` · ${mo.name}` : (dates ? ` · ${dates}` : '')}`,
    routeTitle: G.routeTitle,
    route: S.plan.map((i) => exById(i.id).name),
    rider: r ? `${r.name} · ${r.term}` : '',
    total: S.plan.length && total != null ? G.total.replace('{sum}', usd(total)) : '',
    seasonTitle: G.seasonTitle,
    season: mo?.card || '',
    gift: bonus ? G.giftLine.replace('{gift}', bonus.title[0].toLowerCase() + bonus.title.slice(1)) : '',
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
    'План': S.plan.map((i) => exById(i.id).name).join(', '),
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
    else if ('openPlan' in ds) { renderPlan(); openSheet($('#planSheet')); reach('plan_open'); }
    else if ('openLead' in ds) { closeSheet($('#planSheet')); renderLead(); openSheet($('#leadSheet')); setTimeout(() => $('[data-lead]').name.focus(), 60); }
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
    else if (ds.channel) { channel = ds.channel; $$('[data-channel]').forEach((b) => b.setAttribute('aria-checked', b.dataset.channel === channel)); updatePreview(); }
  });

  $('[data-lead]').addEventListener('input', (e) => {
    if (e.target.name === 'name') { e.target.removeAttribute('aria-invalid'); $('[data-err]').hidden = true; leadName = e.target.value; }
    updatePreview();
  });
  $('[data-lead]').addEventListener('submit', submitLead);
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
