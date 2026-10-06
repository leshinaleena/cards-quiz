import { icons, logoSVG, planeSolid, destinations } from './icons.js';
import { TravelCard, cardFaceHTML } from './card.js';
import { pickCards, isEmpty } from './scoring.js';
import { initAnalytics, track, getUtm } from './analytics.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Три исполнения карты: бордо, графит, жемчуг — и их кант
const TONES = [
  { tone: 'wine', edge: ['#F3D9AE', '#B9806A'] },
  { tone: 'ink', edge: ['#EBD3A0', '#A9845A'] },
  { tone: 'pearl', edge: ['#AB2328', '#69131D'] },
  { tone: 'wine', edge: ['#F1CDB3', '#C48B6E'] },
  { tone: 'ink', edge: ['#F3D3BE', '#B98670'] },
]

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
  const s = { edge: null, labels: [], icons: [], tone: 'wine' };
  for (const q of cfg.questions) {
    for (const id of state.answers[q.id] || []) {
      const c = q.options.find((o) => o.id === id)?.card;
      if (!c) continue;
      if (c.edge) s.edge = c.edge;
      if (c.tone) s.tone = c.tone;
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
  const route = $('#route');
  if ($('#routeStops').children.length !== total) {
    $('#routeStops').innerHTML = Array.from({ length: total }, () => '<i></i>').join('');
  }
  route.style.setProperty('--p', total > 1 ? state.step / (total - 1) : 1);
  $$('#routeStops i').forEach((d, i) => d.classList.toggle('is-done', i <= state.step));
  $('#qTitle').textContent = q.title;
  $('#qHint').textContent = q.type === 'multi' ? (q.hint || t('multiHint')) : (q.hint || '');
  $('#qHint').hidden = !$('#qHint').textContent;

  // Иллюстрации у вариантов — только если они есть у всех вариантов вопроса
  const withArt = q.options.every((o) => destinations[o.art]);
  $('#opts').innerHTML = q.options.map((o) => `
    <button type="button" class="opt${chosen.includes(o.id) ? ' is-on' : ''}" data-id="${esc(o.id)}" aria-pressed="${chosen.includes(o.id)}">
      ${withArt ? `<span class="opt__art">${destinations[o.art]}</span>` : ''}
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
    // Вариант с exclusive (например «Ничего из этого») снимает остальные и наоборот
    const opt = q.options.find((o) => o.id === id);
    if (set.has(id)) {
      q.options.forEach((o) => { if (o.id !== id && (opt.exclusive || o.exclusive)) set.delete(o.id); });
    }
    state.answers[q.id] = [...set];
    $$('#opts .opt').forEach((b) => {
      const on = set.has(b.dataset.id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
    });
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
    el.innerHTML = `<div class="tc__float"><div class="tc__tilt"><div class="tc__spin">${cardFaceHTML(TONES[i])}</div></div></div>`;
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
        ? `<span class="res-card__best" aria-hidden="true">${icons.check}${esc(t('best'))}</span>`
        : '';

    const facts = [['Срок', c.term], ['Стоимость', c.price]]
      .map(([k, v]) => `<li><span>${k}</span><b>${esc(isEmpty(v) ? t('unknown') : v)}</b></li>`).join('');
    return `
      <article class="res-card" role="radio" aria-checked="false" tabindex="-1" data-i="${i}" style="--i:${i}"
        aria-label="${esc(label)}${c.tag ? `, ${esc(c.tag)}` : ''}${i === 0 && !it.alternative ? `, ${esc(t('best'))}` : ''}">
        ${badge}
        <div class="tc tc--static res-card__visual"><div class="tc__float"><div class="tc__tilt"><div class="tc__spin">
          ${cardFaceHTML({ letter, ...TONES[i] })}
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

// Чем вариант выделяется среди показанных: только реальные отличия из данных карт
function advantages(idx, items) {
  const c = items[idx].card;
  const others = items.filter((_, i) => i !== idx).map((x) => x.card);
  const out = [];
  const unique = (field, text) => {
    if (c[field] === true && others.length && others.every((o) => o[field] === false)) out.push(text);
  };
  unique('applePay', 'единственный из вариантов с Apple Pay');
  unique('booking', 'единственный подходит для брони авто и отелей');
  unique('multiCurrency', 'единственный с мультивалютным счётом');
  const num = (o, f) => (typeof o[f] === 'number' ? o[f] : null);
  const best = (f, text) => {
    const v = num(c, f);
    if (v === null || !others.length) return;
    if (others.every((o) => num(o, f) !== null && num(o, f) > v)) out.push(text);
  };
  best('termDays', `самый быстрый выпуск: ${c.term}`);
  best('priceValue', `самый доступный: ${c.price}`);
  return out;
}

function renderWhy() {
  const res = state.result;
  if (res?.status !== 'ok') return;
  const it = res.items[state.selected];
  const { label } = displayInfo(it, state.selected);
  const isBest = state.selected === 0 && !it.alternative;
  const reasons = [...new Set(it.reasons || [])].slice(0, 3);
  const adv = advantages(state.selected, res.items);
  $('#whyTitle').innerHTML = isBest
    ? `Почему мы рекомендуем <em class="serif">${esc(label)}</em>`
    : `Чем хорош <em class="serif">${esc(label)}</em>`;
  const rows = [];
  if (reasons.length) rows.push(`<li><b>${esc(t('why'))}</b><span>${reasons.map(esc).join(' · ')}</span></li>`);
  adv.forEach((a) => rows.push(`<li><b>${esc(a.split(':')[0])}</b>${a.includes(':') ? `<span>${esc(a.split(':').slice(1).join(':').trim())}</span>` : ''}</li>`));
  // Сильные стороны карты из конфига (факты со страниц продукта), всего не больше 4 пунктов
  // Не повторяем уже сказанное: срок/цену из преимуществ и Apple Pay из совпадений
  const said = [...reasons, ...adv].join(' ').toLowerCase();
  const dup = (x) => {
    const l = x.toLowerCase();
    return adv.some((a) => a.includes(x))
      || (it.card.term && l.includes(it.card.term.toLowerCase()) && said.includes(it.card.term.toLowerCase()))
      || (l.includes('apple pay') && said.includes('apple pay'));
  };
  (it.card.strengths || []).filter((x) => !dup(x))
    .slice(0, Math.max(0, 4 - rows.length)).forEach((x) => rows.push(`<li><b>${esc(x)}</b></li>`));
  if (!rows.length) rows.push(`<li><b>${esc(t('whyFallback'))}</b></li>`);
  $('#whyList').innerHTML = rows.join('');
  $('#whyBtnText').textContent = `${t('whyCta')} ${label}`;
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
    renderWhy();
  } else {
    $('#ctaChoice').hidden = true;
  }
  $$('.js-hint').forEach((h) => { h.hidden = true; });
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

/* ---------- Форма заявки → Google Таблица ---------- */
function leadPayload(form) {
  const fd = new FormData(form);
  const data = {
    'Имя': fd.get('name').trim(),
    'Телефон': fd.get('phone').trim(),
    'Email': fd.get('email').trim(),
    website: fd.get('website'),
    'Страница': location.href.split('#')[0],
  };
  const res = state.result;
  if (res?.status === 'ok') {
    const it = res.items[state.selected];
    data['Вариант (код)'] = `${displayInfo(it, state.selected).label} (код ${it.card.id})`;
    data['Фишка варианта'] = it.card.tag || '';
    data['Также предложены'] = res.items.filter((_, i) => i !== state.selected).map((x) => x.card.id).join(', ');
  } else {
    data['Вариант (код)'] = 'индивидуальный подбор';
  }
  for (const q of cfg.questions) {
    data[q.short || q.title] = (state.answers[q.id] || []).map((id) => q.options.find((o) => o.id === id)?.label).filter(Boolean).join(', ');
  }
  Object.assign(data, utm);
  return data;
}

function setupLead() {
  const form = $('#leadForm');
  const ep = cfg.leads?.endpoint;
  form.hidden = false;
  if (cfg.leads.privacyUrl) { $('#leadPrivacy').href = cfg.leads.privacyUrl; $('#leadPrivacy').hidden = false; }
  const status = (text, ok) => {
    const el = $('#leadStatus');
    el.textContent = text; el.hidden = false; el.classList.toggle('is-error', !ok);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = form.phone.value.replace(/\D/g, '');
    if (!form.name.value.trim()) { form.name.focus(); return; }
    if (phone.length < 10) { status(t('leadPhoneError'), false); form.phone.focus(); return; }
    if (!form.consent.checked) { form.consent.focus(); return; }
    const btn = $('#leadSubmit');
    const it0 = state.result?.status === 'ok' ? state.result.items[state.selected] : null;
    if (!ep) {
      // Таблица ещё не подключена: отправляем заявку менеджеру в Telegram с контактами и ответами
      const contact = [`Имя: ${form.name.value.trim()}`, `Телефон: ${form.phone.value.trim()}`, form.email.value.trim() && `Email: ${form.email.value.trim()}`].filter(Boolean).join('\n');
      window.open(tgLink(`${contact}\n\n${buildSummary()}`), '_blank', 'noopener');
      status(t('leadTg'), true);
      track(cfg.analytics?.goals?.lead, { variant: it0 ? it0.card.id : 'none', via: 'telegram' });
      return;
    }
    btn.disabled = true; btn.querySelector('span').textContent = t('leadSending');
    try {
      // Apps Script не отдаёт CORS-заголовки, поэтому no-cors: ответ не читаем, ошибкой считаем только сбой сети
      await fetch(ep, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(leadPayload(form)) });
      status(t('leadDone'), true);
      btn.querySelector('span').textContent = t('leadSent');
      form.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
      const it = state.result?.status === 'ok' ? state.result.items[state.selected] : null;
      track(cfg.analytics?.goals?.lead, { variant: it ? it.card.id : 'none' });
    } catch (_) {
      status(t('leadError'), false);
      btn.disabled = false; btn.querySelector('span').textContent = t('leadSubmit');
    }
  });
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
    const reasons = [...new Set(it.reasons || [])].slice(0, 3);
    if (reasons.length) lines.push(`Подходит, потому что: ${reasons.join(', ')}`);
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

// Ссылка в Telegram с готовым текстом: t.me/<username>?text=… открывает чат с менеджером,
// и сообщение уже стоит в поле ввода — клиенту остаётся нажать «Отправить»
function tgLink(text) {
  const base = (cfg.brand?.telegramManager || '').split('?')[0];
  return `${base}?text=${encodeURIComponent(text.slice(0, 1500))}`;
}

// Копирование, надёжное и для iOS Safari: сначала Clipboard API (вызов в рамках тапа),
// затем запасной путь через редактируемое поле с явным выделением (так требует iOS).
function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.contentEditable = 'true';
  ta.readOnly = false;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0';
  document.body.appendChild(ta);
  let ok = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
    sel.removeAllRanges();
  } catch (_) { ok = false; }
  ta.remove();
  return ok;
}

function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function onContact(e) {
  // Копируем синхронно в рамках клика; ссылка открывается штатно (target=_blank)
  const text = buildSummary();
  // Подставляем текст в ссылку до перехода — браузер откроет уже обновлённый адрес
  if (e?.currentTarget?.tagName === 'A') e.currentTarget.href = tgLink(text);
  const box = e?.currentTarget?.closest('[data-cta]') || $('.cta');
  const hint = box.querySelector('.js-hint');
  copyText(text).then((ok) => {
    hint.querySelector('.js-hint-text').textContent = ok ? t('ctaCopied') : t('ctaCopyFailed');
    // Если браузер не дал скопировать — показываем текст, чтобы его можно было выделить вручную
    let manual = hint.querySelector('.cta__manual');
    if (!ok) {
      if (!manual) { manual = document.createElement('textarea'); manual.className = 'cta__manual'; manual.readOnly = true; manual.rows = 6; hint.appendChild(manual); }
      manual.value = text;
    } else if (manual) manual.remove();
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
  // Атмосферное фото на первом экране: появляется, только если файл есть
  probe(ph.hero).then((ok) => {
    if (!ok) return;
    const fig = $('#heroPhoto');
    fig.querySelector('img').src = ph.hero;
    fig.querySelector('img').alt = t('heroAlt');
    fig.hidden = false;
    $('#heroVisual').classList.add('has-photo');
  });
  // Фото в блоке «Как это работает»: оплата картой в поездке
  if (ph.how) { const img = $('#howPhoto img'); img.alt = t('howAlt'); img.onload = () => { $('#howPhoto').hidden = false; observeReveal(); }; img.src = ph.how; }
  // Фото-подложка в блоке связи с менеджером
  if (ph.cta) { const bg = $('#ctaBg'); bg.onload = () => { bg.hidden = false; }; bg.src = ph.cta; }
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

// Шаги блока «Как это работает» из конфига
function renderLists() {
  $('#howSteps').insertAdjacentHTML('beforeend', (t('howSteps') || []).map((x, i) => `
    <article class="step sr" style="--i:${i}">
      <span class="step__num">${pad(i + 1)}</span>
      <h3 class="step__title">${esc(x.title)}</h3>
      <p class="step__text">${esc(x.text)}</p>
    </article>`).join(''));
}

/* ---------- Появление при прокрутке и параллакс ---------- */
let revealIO = null;
function observeReveal() {
  const els = $$('.sr:not(.is-in)');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  revealIO ||= new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); } });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => revealIO.observe(el));
}

// Пунктирный маршрут в блоке «Как это работает» прорисовывается при прокрутке
function observeRoute() {
  const el = $('#howSteps');
  if (reduced || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
  const io = new IntersectionObserver((en) => {
    if (en.some((x) => x.isIntersecting)) { el.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(el);
}

function startParallax() {
  if (reduced) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    $$('[data-parallax]').forEach((img) => {
      const r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      img.style.transform = `translateY(${(k * -7).toFixed(2)}%) scale(1.14)`;
    });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------- Инициализация ---------- */
function fillStatic() {
  $$('[data-t]').forEach((el) => { const v = t(el.dataset.t); if (typeof v === 'string' && v) el.textContent = v; });
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
  $('.route__plane').innerHTML = planeSolid;  // самолёт на маршруте квиза

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
  renderLists();
  setupLead();
  setupPhotos();
  initAnalytics(cfg.analytics);

  $$('.js-start').forEach((b) => { b.disabled = false; b.addEventListener('click', startQuiz); });
  observeReveal();
  observeRoute();
  startParallax();
  $('#opts').addEventListener('click', onOption);
  $('#nextBtn').addEventListener('click', onNext);
  $('#backBtn').addEventListener('click', onBack);
  $('#restartBtn').addEventListener('click', restart);
  $$('.js-tg').forEach((a) => a.addEventListener('click', onContact));
  $$('.js-phone').forEach((a) => a.addEventListener('click', () => track(cfg.analytics?.goals?.phone)));
  bindResults();
}

init();
