// Автопроверка квиза: node tests/smoke.mjs [url]
// Требует пакет playwright и запущенный сервер (по умолчанию http://localhost:8765/).
import { chromium, devices } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8765/';
const profiles = [
  { name: 'iPhone 13', ...devices['iPhone 13'] },
  { name: 'Desktop 1440', viewport: { width: 1440, height: 900 } },
];

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed += 1; };

const browser = await chromium.launch();
for (const { name, ...opts } of profiles) {
  console.log(`\n— ${name}`);
  const ctx = await browser.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  const goals = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.text().startsWith('[metrika]')) goals.push(m.text().split(' ')[1]); });

  await page.goto(`${URL}?debug&utm_source=smoke`);
  await page.waitForSelector('#startBtn:not([disabled])');
  const tap = (sel) => (opts.hasTouch ? page.tap(sel) : page.click(sel));
  await tap('#startBtn');

  for (let step = 0; step < 6; step += 1) {
    await page.waitForTimeout(700);
    const multi = await page.isVisible('#nextBtn');
    await page.locator('#opts .opt').first().click();
    if (multi) { await page.waitForTimeout(150); await page.click('#nextBtn'); }
  }
  await page.waitForSelector('[data-screen="result"]:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(800);

  const ok = await page.isVisible('#resultOk');
  check(ok || await page.isVisible('#resultNone'), 'показан результат');
  if (ok) {
    check((await page.locator('.res-card').count()) >= 2, 'не меньше двух вариантов');
    check((await page.locator('#whyList li').count()) >= 1, 'есть блок «почему»');
  }
  await page.locator('.why .js-tg, .cta .js-tg').first().click();
  await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  check(clip.includes('Мои ответы') && clip.includes('utm_source=smoke'), 'текст для менеджера скопирован вместе с UTM');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'нет горизонтального скролла');
  check(['quiz_start', 'quiz_step_6', 'contact_manager'].every((g) => goals.includes(g)), 'цели Метрики срабатывают');
  check(errors.length === 0, `нет ошибок JS${errors.length ? ': ' + errors.join('; ') : ''}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `\nОшибок: ${failed}` : '\nВсё в порядке');
process.exit(failed ? 1 : 0);
