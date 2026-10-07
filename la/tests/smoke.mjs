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

  // Квиз проходится при разных ответах и всегда даёт выдачу
  const combos = [
    ['kids', 'd5', ['ocean'], 'm'], ['solo', 'd2', ['unsure'], null], ['friends', 'd4', ['city', 'wine', 'height'], 'l'], ['couple', 'd4', ['parks'], 's'],
  ];
  for (const [who, d, likes, people] of combos) {
    if (await page.isVisible('[data-qrestart]')) await click('[data-qrestart]');
    await click(`[data-opt="${who}"]`); await page.waitForTimeout(300);
    await click(`[data-opt="${d}"]`); await page.waitForTimeout(300);
    for (const l of likes) await click(`[data-opt="${l}"]`);
    await click('[data-qnext]'); await page.waitForTimeout(300);
    if (people) { await click(`[data-opt="${people}"]`); await page.waitForTimeout(400); }
    const n = await page.locator('.dayplan__row').count();
    const want = cfg.quiz.questions[1].options.find((o) => o.id === d).count;
    check(n === want, `квиз ${who}/${d}/${likes.join('+')}: маршрут на ${n} дн.`);
    if (people === 'l') check((await page.textContent('.dayplan')).includes(cfg.plan.individual), '7+ — цены «рассчитаем индивидуально»');
    if (d === 'd5') check(await page.isVisible('.quiz .note'), '5+ дней — плашка Travel Rider');
  }

  // Готовый маршрут добавляется целиком
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]');
  const r3 = cfg.routes.items[1];
  await click(`[data-route="${r3.id}"]`);
  const planIds = await page.evaluate(() => JSON.parse(localStorage.getItem('tr-la-v1')).plan.map((p) => p.id));
  check(JSON.stringify(planIds) === JSON.stringify(r3.days), `маршрут «${r3.title}» добавлен по дням`);
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

  // Заявка: сообщение и ссылки
  await page.evaluate(() => document.querySelector('[data-dock] [data-open-lead]').click());
  await page.fill('[data-lead] [name="name"]', 'Анна');
  await page.fill('[data-lead] [name="dates"]', 'май');
  const preview = await page.textContent('[data-preview]');
  check(!/[{}]/.test(preview), 'в сообщении нет «{…}»');
  check(preview.includes('примерно в мае') && preview.includes('Меня зовут Анна') && preview.includes('Travel Rider'), 'сообщение собрано: месяц, имя, райдер');
  check(!/\(а\)/.test(preview), 'без «(а)»');
  await click('[data-channel="wa"]');
  await click('[data-submit]');
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => window.__opened);
  check(opened?.startsWith(`https://wa.me/${cfg.contacts.whatsapp}?text=`) && !/[а-я]/i.test(opened), 'WhatsApp: кириллица закодирована');
  await page.waitForSelector('[data-gift-img][src^="blob:"]', { timeout: 8000 });
  check(true, 'открытка-подарок нарисована');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('[data-dock] [data-open-lead]').click());
  await page.fill('[data-lead] [name="name"]', 'Анна');
  await click('[data-channel="tg"]');
  await click('[data-submit]');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__opened))?.startsWith(`https://t.me/${cfg.contacts.telegram}?text=`), 'Telegram открывается с набранным текстом');

  for (const g of ['quiz_start', 'quiz_done', 'excursion_add', 'rider_calc', 'plan_open', 'lead_wa', 'lead_tg']) check(goals.includes(g), `цель ${g}`);
  check(!errors.length, `нет ошибок JS ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `\nНе прошло: ${failed}` : '\nВсё прошло');
process.exit(failed ? 1 : 0);
