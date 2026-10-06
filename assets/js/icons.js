// Собственные линейные иконки (stroke = currentColor), без стоковых наборов.
const svg = (body, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  // Бесконтактная оплата: четыре дуги
  nfc: svg('<path d="M7 8.5a5 5 0 0 1 0 7"/><path d="M10.5 6.5a8.5 8.5 0 0 1 0 11"/><path d="M14 4.5a12 12 0 0 1 0 15"/><path d="M17.5 2.8a15 15 0 0 1 0 18.4"/>'),
  // Телефон с волной оплаты
  pay: svg('<rect x="6.5" y="3" width="9" height="18" rx="2"/><path d="M10 18h2"/><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M20.5 7.5a6.5 6.5 0 0 1 0 9"/>'),
  // Ключ от номера / авто
  booking: svg('<circle cx="8" cy="12" r="4"/><path d="M12 12h9"/><path d="M18 12v3"/><path d="M15.5 12v2"/>'),
  // Приложения
  apps: svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><path d="M16.75 14v5.5M14 16.75h5.5"/>'),
  // Стопка монет: мультивалютность
  currency: svg('<ellipse cx="12" cy="6.5" rx="6.5" ry="2.5"/><path d="M5.5 6.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4"/><path d="M5.5 10.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4"/><path d="M5.5 14.5v3c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-3"/>'),
  // Дистанционно: глобус
  remote: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/>'),
  // Поездка: самолёт
  plane: svg('<path d="M10.5 13.5 4 11l1.5-1.5 7 .5 4.5-4.5c.8-.8 2.2-.8 2.5 0 .3.6 0 1.5-.6 2.1L14.5 12l.5 7-1.5 1.5-2.5-6.5"/><path d="m8 16-2.5.5L5 18l3-.5"/>'),
  // Срочно: секундомер
  fast: svg('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.5"/><path d="M10 3.5h4"/><path d="m18 6.5 1.3-1.3"/>'),
  check: svg('<path d="m5 12.5 4.2 4.2L19 7"/>'),
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  back: svg('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>'),
  send: svg('<path d="M20.5 3.5 3.5 10.6l6.4 2.3 2.3 6.6 8.3-16z"/><path d="m9.9 12.9 4.6-4.6"/>'),
  phone: svg('<path d="M5.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3.5 5.7a2 2 0 0 1 2-2.2z"/>'),
  minus: svg('<path d="M7 12h10"/>'),
};

// Чип карты с мягким золотым градиентом
let uid = 0;
// Уникальные id, чтобы градиенты не ссылались на скрытые экземпляры
export const chipSVG = () => { const id = `chip${++uid}`; return `<svg viewBox="0 0 40 30" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F4DDB0"/><stop offset=".55" stop-color="#C9A06E"/><stop offset="1" stop-color="#E9C997"/>
  </linearGradient></defs>
  <rect x=".75" y=".75" width="38.5" height="28.5" rx="5" fill="url(#${id})" stroke="#9C7448" stroke-width=".6"/>
  <g fill="none" stroke="#8C6640" stroke-width=".7" opacity=".75">
    <path d="M14 1v9.5M26 1v9.5M14 29v-9.5M26 29v-9.5"/>
    <path d="M1 10.5h13M26 10.5h13M1 19.5h13M26 19.5h13"/>
    <rect x="14" y="10.5" width="12" height="9" rx="2"/>
  </g>
</svg>`; };

// Логотип TOP RIDERS: плашка с вырезанным «TOP» + «RIDERS» (цвет = currentColor)
export const logoSVG = () => { const id = `trTop${++uid}`; return `<svg viewBox="0 0 400 70" role="img" aria-label="Top Riders">
  <defs><mask id="${id}"><rect width="400" height="70" fill="#fff"/>
    <text x="10" y="52" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="50" letter-spacing="-1" fill="#000">TOP</text>
  </mask></defs>
  <path d="M0 0h112a24 24 0 0 1 24 24v46H24A24 24 0 0 1 0 46z" fill="currentColor" mask="url(#${id})"/>
  <text x="146" y="52" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="50" letter-spacing="-1" fill="currentColor">RIDERS</text>
</svg>`; };
