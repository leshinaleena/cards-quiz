// Вписывает каталог, маршруты, «Как это работает», «Почему мы», «Под ключ» и вопросы прямо в index.html,
// чтобы поисковики и первый экран видели текст без JavaScript. JS потом обновляет их под выбор клиента.
// Запуск: node la/tools/prerender.mjs        — обновить index.html
//         node la/tools/prerender.mjs --check — только проверить, что index.html актуален (для автотеста)
import fs from 'node:fs';
import * as R from '../assets/js/render.js';

const dir = new URL('..', import.meta.url);
const C = JSON.parse(fs.readFileSync(new URL('config.json', dir), 'utf8'));
const file = new URL('index.html', dir);
const html = fs.readFileSync(file, 'utf8');

const parts = {
  how: R.howHtml(C),
  catalog: R.catalogHtml(C),
  routes: R.routesHtml(C),
  why: R.whyHtml(C),
  concierge: R.conciergeHtml(C),
  faq: R.faqHtml(C),
};
let out = html;
for (const [key, body] of Object.entries(parts)) {
  const re = new RegExp(`<!--prerender:${key}-->[\\s\\S]*?<!--/prerender:${key}-->`);
  if (!re.test(out)) throw new Error(`нет метки prerender:${key}`);
  out = out.replace(re, () => `<!--prerender:${key}-->${body.replace(/\n\s*/g, ' ')}<!--/prerender:${key}-->`);
}
if (process.argv.includes('--check')) {
  if (out !== html) { console.error('✗ index.html устарел: запустите node la/tools/prerender.mjs'); process.exit(1); }
  console.log('✓ index.html актуален');
} else {
  fs.writeFileSync(file, out);
  console.log('index.html обновлён');
}
