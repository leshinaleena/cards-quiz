// Автопроверка мини-сайта LA: node la/tests/smoke.mjs [url]
// Нужен playwright и запущенный сервер (по умолчанию http://localhost:8790/).
// Не зависит от числа вопросов и экскурсий: всё берётся из config.json.
import { chromium, devices } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8790/';
const profiles = [
  { name: 'iPhone 13', ...devices['iPhone 13'] },
  { name: 'Desktop 1280', viewport: { width: 1280, height: 860 } },
];
let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed += 1; };

// Каталог и вопросы есть в HTML без JavaScript — для поисковиков
const raw = await (await fetch(URL)).text();
const cfg0 = JSON.parse(await (await fetch(new globalThis.URL('config.json', URL))).text());
check(cfg0.excursions.every((e) => raw.includes(e.name)), 'все экскурсии есть в HTML без JS');
check(cfg0.faq.items.every((f) => raw.includes(f.q)), 'вопросы есть в HTML без JS');

const browser = await chromium.launch();
for (const { name, ...opts } of profiles) {
  console.log(`\n— ${name}`);
  const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  // Тест не пишет в настоящую Google Таблицу: запросы к Apps Script перехватываем
  const logged = [];
  await ctx.route('https://script.google.com/**', (r) => { logged.push(r.request().postData()); r.fulfill({ status: 200, body: 'ok' }); });
  const page = await ctx.newPage();
  const errors = []; const goals = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.text().startsWith('[metrika]')) goals.push(m.text().split(' ')[1]); });
  await page.addInitScript(() => { document.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="https://t.me"], a[href^="https://wa.me"], a[href^="tel:"]'); if (a && !a.closest('footer')) { window.__opened = a.href; e.preventDefault(); } }, true); });
  await page.goto(`${URL}?debug&utm_source=smoke`);
  await page.waitForSelector('html[data-ready]');
  const cfg = await page.evaluate(() => fetch('config.json').then((r) => r.json()));
  const click = (sel) => page.locator(sel).first().click();

  // Нет горизонтальной прокрутки, все фото загрузились
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'нет горизонтальной прокрутки');
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
  await page.waitForTimeout(500);
  check(await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)), 'все фото показаны');

  // Квиз из трёх вопросов: проходится при любых ответах и сразу даёт маршрут
  check(cfg.quiz.questions.length === 3, 'в квизе ровно 3 вопроса');
  const qOpt = (qid, oid) => cfg.quiz.questions.find((q) => q.id === qid).options.find((o) => o.id === oid);
  const combos = [
    ['kids', ['ocean'], 't4'], ['solo', [], 'tx'], ['friends', ['hollywood', 'views', 'unusual'], 't3'], ['couple', ['calm'], 't1'],
  ];
  for (const [who, likes, time] of combos) {
    if (await page.isVisible('[data-qrestart]')) await click('[data-qrestart]');
    await click(`[data-opt="${who}"]`); await page.waitForTimeout(300);
    for (const l of likes) await click(`[data-opt="${l}"]`);
    await click('[data-qnext]'); await page.waitForTimeout(300);
    await click(`[data-opt="${time}"]`); await page.waitForTimeout(400);
    const n = await page.locator('.dayplan__row').count();
    check(n === qOpt('time', time).count, `квиз ${who}/${likes.join('+') || 'без интересов'}/${time}: маршрут на ${n} дн.`);
    const picked = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).picked);
    const clash = picked.some((id) => (cfg.excursions.find((e) => e.id === id).overlaps || []).some((o) => picked.includes(o)));
    check(!clash, 'в маршруте нет экскурсий, которые повторяют друг друга');
    check(await page.isVisible('[data-result-send]') && await page.isVisible('[data-result-keep]'), 'понятный следующий шаг');
    if (qOpt('time', time).long) check(await page.isVisible('.quiz .note'), '4+ дней — плашка Travel Rider');
  }
  // Больше трёх интересов выбрать нельзя
  await click('[data-qrestart]'); await click('[data-opt="couple"]'); await page.waitForTimeout(300);
  for (const l of ['first', 'ocean', 'hollywood', 'views']) await click(`[data-opt="${l}"]`);
  check((await page.locator('[data-opt][aria-pressed="true"]').count()) === 3, 'интересов — не больше трёх');
  // Карта в результате: раскрывается и рисует маршрут
  await click('[data-qnext]'); await page.waitForTimeout(300); await click('[data-opt="t3"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('.quiz .mapbox').open = true; });
  const pickedMap = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).picked);
  check(await page.isVisible('.quiz .map__svg') && (await page.locator('.quiz .map__legend li').count()) === pickedMap.length, 'карта маршрута в результате, дни подписаны');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'карта не даёт горизонтальной прокрутки страницы');
  check(!(await page.isVisible('[data-viewseg]')) && (await page.locator('[data-grid] [data-compare]').count()) === 0, 'в каталоге нет лишних переключателей');

  // Готовый маршрут добавляется целиком
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');
  const r3 = cfg.routes.items[1];
  await click(`[data-route="${r3.id}"]`);
  const planIds = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).plan.map((p) => p.id));
  check(JSON.stringify(planIds) === JSON.stringify(r3.days), `маршрут «${r3.title}» добавлен по дням`);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');

  // «Помочь выбрать»: сравнение экскурсий из поездки
  for (const e of cfg.excursions.slice(0, 2)) await click(`[data-grid] [data-add="${e.id}"]`);
  await page.evaluate(() => document.querySelector('[data-open-plan]').click());
  await page.evaluate(() => document.querySelector('#planSheet [data-open-cmp]').click());
  check((await page.locator('#cmpSheet .cmp thead th').count()) === 3, 'сравнение двух экскурсий из поездки');
  await page.keyboard.press('Escape');

  // Из результата квиза — сразу в заявку с маршрутом
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');
  await click('[data-opt="couple"]'); await page.waitForTimeout(300);
  await click('[data-opt="first"]'); await click('[data-qnext]'); await page.waitForTimeout(300); await click('[data-opt="t3"]'); await page.waitForTimeout(400);
  const picked0 = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).picked);
  check(!(picked0.includes('la6') && picked0.includes('lagrand')), '«впервые»: не предлагаем 6-часовой и гранд-тур вместе');
  await page.evaluate(() => document.querySelector('[data-result-send]').click());
  await page.waitForTimeout(200);
  const pv = await page.textContent('[data-preview]');
  check(picked0.every((id) => pv.includes(cfg.excursions.find((e) => e.id === id).name)), 'форма открылась, маршрут в сообщении');
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');

  // Переключатель группы меняет цены в каталоге
  await click('[data-group="s"]');
  const ex = cfg.excursions.find((e) => e.price);
  const sel = `[data-grid] [data-card="${ex.id}"] .card__price`;
  check((await page.textContent(sel)).includes(String(ex.price.s)), `1–3: ${ex.name} $${ex.price.s}`);
  await click('[data-group="m"]');
  check((await page.textContent(sel)).replace(/\s/g, '').includes(String(ex.price.m)), `4–6: ${ex.name} $${ex.price.m}`);
  await click('[data-group="s"]');

  // Добавление в план, сумма, сохранение после перезагрузки
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');
  const two = cfg.excursions.filter((e) => e.price).slice(0, 2);
  for (const e of two) await click(`[data-grid] [data-add="${e.id}"]`);
  const sum = two.reduce((s, e) => s + e.price.s, 0);
  await page.reload(); await page.waitForSelector('html[data-ready]');
  await page.evaluate(() => scrollTo(0, 2000)); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('[data-open-plan]').click());
  const planText = (await page.textContent('[data-plan]')).replace(/\s/g, '');
  check(planText.includes(`$${sum.toLocaleString('ru-RU').replace(/\s/g, '')}`), `поездка сохранилась после перезагрузки, итог $${sum}`);
  check((await page.locator('.plan-item__day').count()) === 2, 'поездка разложена по дням');
  await page.evaluate(() => document.querySelector('[data-move="0"][data-d="1"]').click());
  const firstAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).plan[0].id);
  check(firstAfter === two[1].id, 'дни переставляются');
  check(await page.isVisible('[data-plan] .note'), '2+ экскурсии — подсказка про райдер');

  // Райдер: калькулятор и переключатель валюты
  await page.keyboard.press('Escape');
  const travel = cfg.riders.items.find((r) => r.id === 'travel');
  await click('[data-cur="usd"]');
  check((await page.textContent('[data-calc]')).replace(/\s/g, '').includes(String(travel.packages[0].usd)), `Travel 7 дней в $: ${travel.packages[0].usd}`);
  for (let i = 0; i < 9; i += 1) await click('[data-step="days"][data-d="1"]'); // 16 дней
  const t16 = travel.packages[1].usd + 2 * travel.extraDayUsd;
  check((await page.textContent('.calc__price')).replace(/\s/g, '').includes(String(t16)), `16 дней: ${t16} $`);
  await click('[data-cur="rub"]');
  check((await page.textContent('[data-calc]')).includes(cfg.riders.calc.extraDaysRub), '₽: строка про +80 $ сверх 14 дней');
  await click('[data-calc="goal"][data-v="move"]');
  check((await page.textContent('.calc__name')).includes('Top Rider'), 'цель «переезд» → Top Rider');
  await click('[data-calc="goal"][data-v="rest"]');
  await click('[data-calc-add]');

  // Заявка: одно нажатие, никаких полей
  await page.evaluate(() => document.querySelector('[data-dock] [data-open-lead]').click());
  check((await page.locator('[data-lead] input').count()) === 0, 'в форме нет полей для ввода');
  await click('[data-leadmonth="4"]');
  await page.evaluate(() => document.querySelector('.lead__preview').open = true);
  const preview = await page.textContent('[data-preview]');
  check(!/[{}]/.test(preview), 'в сообщении нет «{…}»');
  check(preview.includes('в мае') && preview.includes('Travel Rider') && preview.includes('Мой маршрут'), 'сообщение собрано: месяц, маршрут, райдер');
  check(!/\(а\)/.test(preview), 'без «(а)»');
  await click('[data-send="wa"]');
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => window.__opened);
  check(opened?.startsWith(`https://wa.me/${cfg.contacts.whatsapp}?text=`) && !/[а-я]/i.test(opened), 'WhatsApp: одно нажатие, кириллица закодирована');
  await page.waitForSelector('[data-gift-img][src^="blob:"]', { timeout: 8000 });
  check(true, 'открытка нарисована');
  const giftHref = await page.getAttribute('[data-gift-file]', 'href');
  const giftOk = giftHref && (await page.evaluate(async (h) => (await fetch(h)).ok, giftHref));
  check(giftOk, `подарок скачивается: ${giftHref}`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('[data-dock] [data-open-lead]').click());
  await click('[data-send="tg"]');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__opened))?.startsWith(`https://t.me/${cfg.contacts.telegram}?text=`), 'Telegram открывается с набранным текстом');

  check(logged.some((b) => b?.includes('Квиз пройден')) && logged.some((b) => b?.includes('Заявка')), 'события уходят в таблицу (перехвачены тестом)');
  check(!logged.some((b) => /Анна|\+7|@/.test(b || '')), 'в таблицу не уходят имя и контакты');

  for (const g of ['quiz_start', 'quiz_done', 'excursion_add', 'rider_calc', 'plan_open', 'lead_wa', 'lead_tg', 'map_open', 'compare_open']) check(goals.includes(g), `цель ${g}`);
  check(!errors.length, `нет ошибок JS ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `\nНе прошло: ${failed}` : '\nВсё прошло');
process.exit(failed ? 1 : 0);
