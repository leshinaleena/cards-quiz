// Собирает подарки-памятки в PDF (A5) из la/tools/gifts.json: node la/tools/gifts.mjs
// Нужен playwright. Результат — la/gifts/*.pdf и превью la/gifts/*.jpg
import fs from 'node:fs';
import { chromium } from 'playwright';

const dir = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, dir));
const C = JSON.parse(read('config.json'));
const G = JSON.parse(read('tools/gifts.json'));
const logo = read('assets/logo-word.svg').toString().replace(/currentColor/g, '#F2EAE3');
const photo = (n) => `data:image/jpeg;base64,${read(`assets/photos/${n}.jpg`).toString('base64')}`;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const css = `
@page { size: 148mm 210mm; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font: 400 10.5pt/1.5 Inter, Arial, sans-serif; color: #2B1B1E; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 148mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background: #F2EAE3; }
.cover img.ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(52,9,16,.35) 0%, rgba(232,149,127,.05) 35%, rgba(105,19,29,.85) 72%, #4C0D15 100%); }
.cover .in { position: absolute; inset: 0; z-index: 1; padding: 14mm 12mm; display: flex; flex-direction: column; color: #F2EAE3; }
.logo { width: 38mm; }
.logo svg { width: 100%; height: auto; display: block; }
.kick { margin-top: auto; font: 600 8pt/1 Montserrat, Arial; letter-spacing: .2em; text-transform: uppercase; color: #F3B8A6; }
.cover h1 { margin: 4mm 0 0; font: 800 24pt/1.05 Montserrat, Arial; letter-spacing: -.01em; }
.cover .gift { margin-top: 6mm; display: inline-block; align-self: flex-start; padding: 2.5mm 4mm; border-radius: 4mm 1mm 4mm 1mm; background: #E8957F; color: #4C0D15; font: 600 8.5pt/1 Montserrat, Arial; }
.text { padding: 13mm 12mm 22mm; }
.intro { font-size: 11pt; margin: 0 0 7mm; padding-left: 4mm; border-left: 1.2mm solid #E8957F; }
h2 { margin: 6mm 0 2.5mm; font: 800 12.5pt/1.2 Montserrat, Arial; color: #69131D; }
ul { margin: 0; padding: 0; list-style: none; }
li { display: flex; gap: 3mm; margin: 0 0 1.8mm; }
li::before { content: ''; width: 1.6mm; height: 1.6mm; margin-top: 1.9mm; border-radius: .6mm 0 .6mm 0; background: #E8957F; flex: none; }
.months { display: grid; grid-template-columns: 22mm 1fr; border-top: .3mm solid rgba(105,19,29,.18); }
.months div { padding: 2.6mm 0; border-bottom: .3mm solid rgba(105,19,29,.18); font-size: 9.5pt; }
.months .m { font: 600 8.5pt/1.5 Montserrat, Arial; text-transform: uppercase; letter-spacing: .06em; color: #69131D; }
.foot { position: absolute; left: 12mm; right: 12mm; bottom: 9mm; display: flex; justify-content: space-between; font: 600 8pt/1 Montserrat, Arial; color: #69131D; border-top: .3mm solid rgba(105,19,29,.25); padding-top: 3mm; }
`;

const page = (id, g) => {
  const body = g.months
    ? `<div class="months">${C.seasons.months.map((m) => `<div class="m">${esc(m.name)}</div><div>${esc(m.card)}</div>`).join('')}</div>`
    : g.sections.map((s) => `<h2>${esc(s.h)}</h2><ul>${s.items.map((i) => `<li><span>${esc(i)}</span></li>`).join('')}</ul>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Montserrat:wght@600;800&display=swap"><style>${css}</style></head><body>
  <section class="page cover"><img class="ph" src="${photo(g.photo)}" alt=""><div class="in"><div class="logo">${logo}</div>
    <div class="kick">${esc(g.kicker)}</div><h1>${esc(g.title)}</h1><span class="gift">Подарок от TOP RIDERS</span></div></section>
  <section class="page"><div class="text"><p class="intro">${esc(g.intro)}</p>${body}</div>
    <div class="foot"><span>@${C.contacts.telegram}</span><span>${C.contacts.phoneLabel}</span><span>${C.contacts.site}</span></div></section>
  </body></html>`;
};

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 560, height: 794 } });
for (const [id, g] of Object.entries(G)) {
  await p.setContent(page(id, g), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: new URL(`gifts/${id}.pdf`, dir).pathname, width: '148mm', height: '210mm', printBackground: true });
  await p.screenshot({ path: new URL(`gifts/${id}.jpg`, dir).pathname, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 560, height: 794 } });
  const overflow = await p.evaluate(() => { const t = document.querySelectorAll('.text')[0]; const f = document.querySelector('.foot'); return t.lastElementChild.getBoundingClientRect().bottom > f.getBoundingClientRect().top - 4; });
  console.log(id, overflow ? '⚠ текст не помещается на страницу' : 'ok');
}
await browser.close();
