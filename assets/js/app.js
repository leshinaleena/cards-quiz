import { icons, logoSVG } from './icons.js';
import { TravelCard, cardFaceHTML } from './card.js';
import { pickCards, isEmpty } from './scoring.js';
import { initAnalytics, track, getUtm } from './analytics.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const EDGES = [
  ['#F6DFA9', '#B9806A'],
  ['#F1CDB3', '#C48B6E'],
  ['#F4D3D6', '#C17F89'],
  ['#EFE0C0', '#B9976A'],
  ['#F3D3BE', '#B98670'],
];

let cfg;
let card;
const utm = getUtm();
const state = { step: 0, answers: {}, result: null, selected: 0, busy: false };

/* ---------- Загрузка конфига ---------- */
async function loadConfig() {
  const res = await fetch('config.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`config.json: ${res.status}`);
  return res.json();
}

const t = (key) => cfg?.texts?.[key] ?? '';

/* ---------- Экраны ---------- */
function showScreen(name) {
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== name; s.classList.remove('is-enter'); });
  const scr = $(`[data-screen="${name}"]`);
  window.scrollTo({ top: 0, behavior: 'instant' });
  void scr.offsetWidth; // перезапуск анимации появления
  scr.classList.add('is-enter');
  document.body.dataset.screen = name;
  return scr;
}

/* ---------- Состояние карты из ответов ---------- */
function cardState() {
  const s = { edge: null, labels: [], icons: [] };
  for (const q of cfg.questions) {
    for (const id of state.answers[q.id] || []) {
      const c = q.options.find((o) => o.id === id)?.card;
      if (!c) continue;
      if (c.edge) s.edge = c.edge;
      if (c.label) s.labels.push(c.label);
      if (c.icon && !s.icons.includes(c.icon)) s.icons.push(c.icon);
    }
  }
  return s;
}

/* ---------- Квиз ---------- */
function startQuiz() {
  track(cfg.analytics?.goals?.start);
  state.step = 0;
  state.answers = {};
  card.apply(cardState());
  card.moveTo($('#slotCorner'), { mutate: () => showScreen('quiz') });
  renderStep(1);
  $('#qTitle').focus({ preventScroll: true });
}

function renderStep(dir = 1) {
  const q = cfg.questions[state.step];
  const total = cfg.questions.length;
  const chosen = state.answers[q.id] || [];

  $('#stepNow').textContent = pad(state.step + 1);
  $('#stepTotal').textContent = pad(total);
  $('#stepSr').textContent = `Вопрос ${state.step + 1} из ${total}`;
  $('#progressBar').style.transform = `scaleX(${(state.step + 1) / total})`;
  $('#qTitle').textContent = q.title;
  $('#qHint').textContent = q.type === 'multi' ? (q.hint || t('multiHint')) : (q.hint || '');
  $('#qHint').hidden = !$('#qHint').textContent;

  $('#opts').innerHTML = q.options.map((o) => `
    <button type="button" class="opt${chosen.includes(o.id) ? ' is-on' : ''}" data-id="${esc(o.id)}" aria-pressed="${chosen.includes(o.id)}">
      ${o.photo && photoOk[o.photo] !== false ? `<span class="opt__photo"><img src="${esc(o.photo)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.remove()"></span>` : ''}
      <span class="opt__label">${esc(o.label)}</span>
      <span class="opt__check">${icons.check}</span>
    </button>`).join('');
  $('#opts').classList.toggle('opts--multi', q.type === 'multi');

  const next = $('#nextBtn');
  next.hidden = q.type !== 'multi';
  next.disabled = !chosen.length;

  if (!reduced) {
    $$('#quizBody > *:not([hidden]), #opts > .opt').forEach((el, i) => {
      el.animate(
        [{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 460, delay: i * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
      );
    });
  } else {
    $('#quizBody').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  }
}

async function goStep(to, dir) {
  state.busy = true;
  const body = $('#quizBody');
  await body.animate(
    reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 28}px)` }],
    { duration: 200, easing: 'ease-in', fill: 'forwards' }
  ).finished.then((a) => { renderStep(dir); a.cancel(); });
  $('#qTitle').focus({ preventScroll: true });
  state.busy = false;
}

function nextStep() {
  if (state.step < cfg.questions.length - 1) {
    state.step += 1;
    return goStep(state.step, 1);
  }
  return finish();
}

function trackAnswer(q) {
  const labels = (state.answers[q.id] || []).map((id) => q.options.find((o) => o.id === id)?.label);
  track(`${cfg.analytics?.goals?.step}_${state.step + 1}`, { question: q.id, answer: labels.join(', ') });
}

function onOption(e) {
  const btn = e.target.closest('.opt');
  if (!btn || state.busy) return;
  const q = cfg.questions[state.step];
  const id = btn.dataset.id;

  const r = btn.getBoundingClientRect();
  const x = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50;
  const y = e.clientY ? ((e.clientY - r.top) / r.height) * 100 : 50;
  btn.style.setProperty('--px', `${x}%`);
  btn.style.setProperty('--py', `${y}%`);

  if (q.type === 'multi') {
    const set = new Set(state.answers[q.id] || []);
    set.has(id) ? set.delete(id) : set.add(id);
    state.answers[q.id] = [...set];
    btn.classList.toggle('is-on', set.has(id));
    btn.setAttribute('aria-pressed', set.has(id));
    $('#nextBtn').disabled = !set.size;
    card.apply(cardState());
    card.nod();
    return;
  }

  state.answers[q.id] = [id];
  $$('#opts .opt').forEach((b) => {
    const on = b === btn;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on);
  });
  state.busy = true;
  card.apply(cardState(), { spin: true });
  trackAnswer(q);
  setTimeout(() => { state.busy = false; nextStep(); }, 300);
}

function onNext() {
  if (state.busy) return;
  const q = cfg.questions[state.step];
  if (!(state.answers[q.id] || []).length) return;
  card.apply(cardState(), { spin: true });
  trackAnswer(q);
  nextStep();
}

function onBack() {
  if (state.busy) return;
  if (state.step === 0) {
    card.moveTo($('#slotHero'), { mutate: () => showScreen('hero') });
    return;
  }
  state.step -= 1;
  goStep(state.step, -1);
}

/* ---------- Подсчёт: тасовка карт ---------- */
async function shuffle(keep) {
  const stage = $('#shuffle');
  const N = 5;
  stage.innerHTML = '';
  const cards = Array.from({ length: N }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'tc tc--static shuffle__card';
    el.innerHTML = `<div class="tc__float"><div class="tc__tilt"><div class="tc__spin">${cardFaceHTML({ edge: EDGES[i] })}</div></div></div>`;
    el.style.zIndex = i;
    stage.appendChild(el);
    return el;
  });

  if (reduced) {
    stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' });
    await wait(1300);
    return;
  }

  const T = (x, y, r, s = 1) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
  const move = (el, to, opts, extra = {}) => {
    const from = el._t || T(0, 0, 0);
    const a = el.animate([{ transform: from, ...extra.from }, { transform: to, ...extra.to }], { fill: 'forwards', ...opts });
    el._t = to;
    return a.finished.then(() => { el.style.transform = to; if (extra.to?.opacity !== undefined) el.style.opacity = extra.to.opacity; a.cancel(); });
  };
  const narrow = Math.min(1, window.innerWidth / 600); // на телефоне веер компактнее
  const fan = (els, spread, dur, ease = 'cubic-bezier(.2,.8,.2,1)') => Promise.all(els.map((el, i) => {
    const k = els.length === 1 ? 0 : i / (els.length - 1) - 0.5; // -0.5..0.5
    return move(el, T(k * spread * 4.4 * narrow, Math.abs(k) * 22, k * spread * (0.6 + 0.4 * narrow)), { duration: dur, delay: i * 25, easing: ease });
  }));

  // 1. Появление стопкой и веер
  await Promise.all(cards.map((el, i) => move(el, T(0, -i * 2, 0), { duration: 220, delay: i * 30 }, { from: { opacity: 0 }, to: { opacity: 1 } })));
  await fan(cards, 56, 380);
  // 2. Тасуем: собираем и раскладываем в другом порядке
  await Promise.all(cards.map((el) => move(el, T(0, -8, 0, 0.96), { duration: 200, easing: 'ease-in' })));
  const order = [2, 0, 4, 1, 3].map((i) => cards[i]);
  order.forEach((el, i) => { el.style.zIndex = i; });
  await fan(order, 56, 300);
  // 3. Лишние отлетают
  const removeCount = N - Math.max(1, keep);
  const byEdge = [...order.keys()].sort((a, b) => Math.abs(b - 2) - Math.abs(a - 2) || a - b);
  const gone = byEdge.slice(0, removeCount).map((i) => order[i]);
  await Promise.all(gone.map((el, i) => {
    const side = order.indexOf(el) < 2 ? -1 : 1;
    return move(el, T(side * window.innerWidth * 0.75, -90, side * 50, 0.9),
      { duration: 360, delay: i * 100, easing: 'cubic-bezier(.5,0,.75,0)' }, { to: { opacity: 0 } });
  }));
  // 4. Оставшиеся аккуратно складываются
  const rest = order.filter((el) => !gone.includes(el));
  await fan(rest, rest.length > 2 ? 26 : 18, 280);
  await wait(120);
}

async function finish() {
  state.result = pickCards(cfg, state.answers);
  state.selected = 0;
  renderResults();
  const keep = state.result.status === 'ok' ? state.result.items.length : 1;
  showScreen('loading');
  await shuffle(keep);

  if (state.result.status === 'ok') {
    showScreen('result');
    $('#cmp').classList.remove('is-in');
    observeCompare();
    track(cfg.analytics?.goals?.result, { variants: state.result.items.map((x) => x.card.id).join(',') });
  } else {
    showScreen('result');
    card.apply(cardState());
    card.moveTo($('#slotNone'), { animate: false });
    track(cfg.analytics?.goals?.nonstandard);
  }
  $(state.result.status === 'ok' ? '#resultHeading' : '#resultNone h2').focus({ preventScroll: true });
}

/* ---------- Результат ---------- */
function displayInfo(item, i) {
  const letter = cfg.scoring?.relabelResults === false ? item.card.id : String.fromCharCode(65 + i);
  const label = cfg.scoring?.relabelResults === false ? (item.card.label || `Вариант ${letter}`) : `Вариант ${letter}`;
  return { letter, label };
}

function cell(row, c) {
  const unknown = { kind: 'unknown', text: t('unknown'), key: '?' };
  if (row.type === 'flags') {
    const fields = Object.keys(row.fields || {});
    if (fields.every((f) => isEmpty(c[f]))) return unknown;
    const on = fields.filter((f) => c[f] === true).map((f) => row.fields[f]);
    return on.length ? { kind: 'yes', text: on.join(' · '), key: on.join() } : { kind: 'no', text: 'Нет', key: 'no' };
  }
  const v = c[row.field];
  if (isEmpty(v)) return unknown;
  if (row.type === 'bool') {
    if (v === true) return { kind: row.yes ? 'text' : 'yes', text: row.yes || 'Да', key: 'y' };
    return { kind: row.no ? 'text' : 'no', text: row.no || 'Нет', key: 'n' };
  }
  if (row.type === 'list') return { kind: 'text', text: [].concat(v).join(' · '), key: [].concat(v).join() };
  return { kind: 'text', text: String(v), key: String(v) };
}

function renderResults() {
  const { status, items } = state.result;
  $('#resultOk').hidden = status !== 'ok';
  $('#resultNone').hidden = status === 'ok';
  if (status !== 'ok') { updateSelection(); return; }

  const cols = items.length;
  $('#resTrack').style.setProperty('--cols', cols);
  $('#resTrack').innerHTML = items.map((it, i) => {
    const { letter, label } = displayInfo(it, i);
    const c = it.card;
    const badge = it.alternative
      ? `<span class="res-card__alt">${esc(t('alternative'))}</span>`
      : i === 0
        ? `<span class="res-card__rec" aria-hidden="true"><span>${esc(t('recommend'))}</span>
             <svg viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8c14-6 34 0 40 18"/><path d="m37 22 7 5 4-8"/></svg></span>`
        : '';
    const facts = [['Срок', c.term], ['Стоимость', c.price]]
      .map(([k, v]) => `<li><span>${k}</span><b>${esc(isEmpty(v) ? t('unknown') : v)}</b></li>`).join('');
    return `
      <article class="res-card" role="radio" aria-checked="false" tabindex="-1" data-i="${i}"
        aria-label="${esc(label)}${c.tag ? `, ${esc(c.tag)}` : ''}${i === 0 && !it.alternative ? `, ${esc(t('recommend'))}` : ''}">
        ${badge}
        <div class="tc tc--static res-card__visual"><div class="tc__float"><div class="tc__tilt"><div class="tc__spin">
          ${cardFaceHTML({ letter, edge: EDGES[i] })}
        </div></div></div></div>
        <h3 class="res-card__title">${esc(label)}</h3>
        ${c.tag ? `<p class="res-card__tag">${esc(c.tag)}</p>` : ''}
        <ul class="res-card__facts">${facts}</ul>
        <span class="res-card__pick"><span class="res-card__radio">${icons.check}</span><span class="res-card__pick-text"></span></span>
      </article>`;
  }).join('');

  $('#resDots').innerHTML = cols > 1 ? items.map((_, i) => `<span data-i="${i}"></span>`).join('') : '';

  // Таблица сравнения
  const head = `<div class="cmp__row cmp__row--head"><div class="cmp__label"></div><div class="cmp__vals">${
    items.map((it, i) => `<div class="cmp__val" data-col="${i}">${esc(displayInfo(it, i).label)}</div>`).join('')}</div></div>`;
  const rows = (cfg.compare || []).map((row, ri) => {
    const cells = items.map((it) => cell(row, it.card));
    const diff = new Set(cells.map((c) => c.key)).size > 1;
    return `<div class="cmp__row${diff ? ' is-diff' : ''}" style="--i:${ri}" role="row">
      <div class="cmp__label" role="rowheader">${esc(row.label)}${diff ? `<span class="cmp__diff">${esc(t('compareDiff'))}</span>` : ''}</div>
      <div class="cmp__vals">${cells.map((c, i) => `
        <div class="cmp__val cmp__val--${c.kind}" data-col="${i}" role="cell">
          <span class="cmp__colname">${esc(displayInfo(items[i], i).letter)}</span>
          ${c.kind === 'yes' ? icons.check : c.kind === 'no' ? icons.minus : ''}<span>${esc(c.text)}</span>
        </div>`).join('')}
      </div></div>`;
  }).join('');
  $('#cmp').style.setProperty('--cols', cols);
  $('#cmp').innerHTML = head + rows;

  updateSelection();
}

function updateSelection() {
  const res = state.result;
  if (res?.status === 'ok') {
    $$('.res-card').forEach((el, i) => {
      const on = i === state.selected;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-checked', on);
      el.tabIndex = on ? 0 : -1;
      el.querySelector('.res-card__pick-text').textContent = on ? t('selected') : t('select');
    });
    $$('#cmp [data-col]').forEach((el) => el.classList.toggle('is-sel', Number(el.dataset.col) === state.selected));
    const it = res.items[state.selected];
    const { label } = displayInfo(it, state.selected);
    $('#ctaChoice').innerHTML = `Вы выбрали: <b>${esc(label)}</b>${it.card.tag ? ` · ${esc(it.card.tag)}` : ''}`;
    $('#ctaChoice').hidden = false;
  } else {
    $('#ctaChoice').hidden = true;
  }
  $('#ctaHint').hidden = true;
}

function selectCard(i, focus = false) {
  state.selected = i;
  updateSelection();
  const el = $$('.res-card')[i];
  if (focus) el.focus();
}

function bindResults() {
  const track_ = $('#resTrack');
  track_.addEventListener('click', (e) => {
    const el = e.target.closest('.res-card');
    if (!el) return;
    selectCard(Number(el.dataset.i));
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  });
  track_.addEventListener('keydown', (e) => {
    const n = state.result?.items?.length || 0;
    if (!n) return;
    const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (map[e.key]) {
      e.preventDefault();
      selectCard((state.selected + map[e.key] + n) % n, true);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const el = e.target.closest('.res-card');
      if (el) selectCard(Number(el.dataset.i));
    }
  });
  // Индикатор свайпа
  track_.addEventListener('scroll', () => {
    const items = $$('.res-card');
    const mid = track_.scrollLeft + track_.clientWidth / 2;
    let best = 0, dist = Infinity;
    items.forEach((el, i) => {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    $$('#resDots span').forEach((d, i) => d.classList.toggle('is-on', i === best));
  }, { passive: true });
}

function observeCompare() {
  const el = $('#cmp');
  $$('#resDots span').forEach((d, i) => d.classList.toggle('is-on', i === 0));
  if (reduced || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((x) => x.isIntersecting)) { el.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.15 });
  io.observe(el);
}

/* ---------- Связь с менеджером ---------- */
function buildSummary() {
  const c = cfg.clipboard || {};
  const lines = [c.greeting, ''];
  const res = state.result;
  if (res?.status === 'ok') {
    const it = res.items[state.selected];
    const { label } = displayInfo(it, state.selected);
    lines.push(`${c.variantTitle}: ${label}${it.card.tag ? ` — ${it.card.tag}` : ''} (код ${it.card.id})`);
    const others = res.items.map((x, i) => (i === state.selected ? null : `${displayInfo(x, i).label} (код ${x.card.id})`)).filter(Boolean);
    if (others.length) lines.push(`Также предложены: ${others.join(', ')}`);
  } else {
    lines.push(`${c.variantTitle}: ${c.variantNone}`);
  }
  lines.push('', `${c.answersTitle}:`);
  for (const q of cfg.questions) {
    const ans = (state.answers[q.id] || []).map((id) => q.options.find((o) => o.id === id)?.label).filter(Boolean);
    if (ans.length) lines.push(`• ${q.short || q.title}: ${ans.join(', ')}`);
  }
  const u = Object.entries(utm);
  if (u.length) lines.push('', `${c.utmTitle}: ${u.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  return lines.join('\n');
}

function copyText(text) {
  let ok = false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
    ta.remove();
  } catch (_) { /* старые браузеры */ }
  if (navigator.clipboard?.writeText) {
    const p = navigator.clipboard.writeText(text).then(() => true, () => ok);
    return ok ? Promise.resolve(true) : p;
  }
  return Promise.resolve(ok);
}

function onContact() {
  // Копируем синхронно в рамках клика; ссылка открывается штатно (target=_blank)
  const text = buildSummary();
  const hint = $('#ctaHint');
  copyText(text).then((ok) => {
    $('#ctaHintText').textContent = ok ? t('ctaCopied') : t('ctaCopyFailed');
    hint.hidden = false;
    hint.classList.remove('is-shown');
    void hint.offsetWidth;
    hint.classList.add('is-shown');
  });
  const it = state.result?.status === 'ok' ? state.result.items[state.selected] : null;
  track(cfg.analytics?.goals?.contact, { variant: it ? it.card.id : 'none' });
}

function restart() {
  state.answers = {};
  state.step = 0;
  state.result = null;
  card.apply(cardState(), { spin: true });
  card.moveTo($('#slotCorner'), { mutate: () => showScreen('quiz') });
  renderStep(1);
  track(cfg.analytics?.goals?.start, { restart: true });
}

/* ---------- Фото ---------- */
// Фото необязательны: если файла нет, блок не показывается
const photoOk = {};
function probe(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(false);
    const img = new Image();
    img.onload = () => { photoOk[src] = true; resolve(true); };
    img.onerror = () => { photoOk[src] = false; resolve(false); };
    img.src = src;
  });
}

function setupPhotos() {
  const ph = cfg.photos || {};
  probe(ph.hero).then((ok) => {
    if (!ok) return;
    const fig = $('#heroPhoto');
    const img = fig.querySelector('img');
    img.src = ph.hero;
    img.alt = ph.heroAlt || '';
    fig.hidden = false;
    $('#heroVisual').classList.add('has-photo');
  });
  probe(ph.manager).then((ok) => {
    if (!ok) return;
    const box = $('#ctaManager');
    box.querySelector('img').src = ph.manager;
    box.querySelector('img').alt = ph.managerName || '';
    $('#managerName').textContent = ph.managerName || '';
    $('#managerName').hidden = !ph.managerName;
    $('#managerRole').textContent = ph.managerRole || '';
    box.hidden = false;
  });
  // Миниатюры в вопросах подгружаем заранее, чтобы не мигали
  cfg.questions.forEach((q) => q.options.forEach((o) => o.photo && probe(o.photo)));
}

/* ---------- Инициализация ---------- */
function fillStatic() {
  $$('[data-t]').forEach((el) => { const v = t(el.dataset.t); if (v) el.textContent = v; });
  $$('.js-logo').forEach((el) => { el.innerHTML = logoSVG(); });
  const b = cfg.brand || {};
  $$('.js-tg').forEach((a) => { a.href = b.telegramManager; });
  $$('.js-phone').forEach((a) => { a.href = b.phoneHref; });
  $$('.js-phone-text').forEach((el) => { el.textContent = b.phone; });
  $('#linkChannel').href = b.channel;
  $('#linkChannel span').textContent = b.channelLabel;
  $('#linkSite').href = b.site;
  $('#linkSite span').textContent = b.siteLabel;
  $('#logoLink').href = b.site;
}

async function init() {
  if (reduced) document.documentElement.classList.add('reduced');
  $$('.js-logo').forEach((el) => { el.innerHTML = logoSVG(); });

  card = new TravelCard({ reduced });
  card.moveTo($('#slotHero'), { animate: false });

  try {
    cfg = await loadConfig();
  } catch (err) {
    console.error(err);
    $('#configError').hidden = false;
    return;
  }
  fillStatic();
  setupPhotos();
  initAnalytics(cfg.analytics);

  const start = $('#startBtn');
  start.disabled = false;
  start.addEventListener('click', startQuiz);
  $('#opts').addEventListener('click', onOption);
  $('#nextBtn').addEventListener('click', onNext);
  $('#backBtn').addEventListener('click', onBack);
  $('#restartBtn').addEventListener('click', restart);
  $$('.js-tg').forEach((a) => a.addEventListener('click', onContact));
  $$('.js-phone').forEach((a) => a.addEventListener('click', () => track(cfg.analytics?.goals?.phone)));
  bindResults();
}

init();
