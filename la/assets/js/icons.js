// Иллюстрации в плитках: плоские заливки в цветах бренда.
// Слои: .b — бледный фон, .g — земля/вода, .c — солнце, .a — главный предмет, .h — светлые прорези.
const art = (body) => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;

export const ILLUSTRATIONS = {
  palms: art(`
    <path class="b" d="M2 56V42h7v-7h6v10h5v-6h7v17Zm38 0V38h6v-5h5v8h6v15Z"/>
    <circle class="c" cx="47" cy="16" r="7"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M27 56c1-13 0-24-4-34l2.6-1c4 10 5 22 4.4 35Z"/>
    <path class="a" d="M24 21c-4-5-12-6-17-2 6-.5 11 .5 15.5 3.5ZM24.5 20.5c0-6 4-10 10-11-3.5 3-6 7-7.5 11.5ZM24 21c-6-1-11 2-13 7 4-3 8.5-4.5 12.5-4.5ZM25 20.5c5-1.5 10 0 13 4.5-4.5-2-9-2.5-12.5-2Z"/>
    <path class="a" d="M41 56c0-9 .5-17 3-24l2.4.8c-2.3 7-2.7 14.5-2.4 23.2Z"/>
    <path class="a" d="M45 32c-3-4-9-5-13-2 4.5 0 8.5 1 12 3ZM45.5 31.5c1-5 5-8 9.5-8-3 2.5-5.5 5.5-7 9ZM45.5 32c4-1 8 .5 10.5 4-3.5-1.5-7-2-10-1.6Z"/>`),
  pier: art(`
    <circle class="c" cx="17" cy="18" r="8"/>
    <path class="b" d="M0 44h64v12H0Z"/>
    <rect class="a" x="4" y="35" width="56" height="4" rx="1"/>
    <path class="a" d="M8 39h3v17H8Zm11 0h3v17h-3Zm11 0h3v17h-3Zm11 0h3v17h-3Zm11 0h3v17h-3Z"/>
    <path class="a" d="M47 35V20h2v15Z"/>
    <path class="a" d="M44.5 21h7l-1.6-7h-3.8Z"/>
    <path class="c" d="M46.4 19.5h3.2l-.8-4h-1.6Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="h" d="M4 50c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2" fill="none" stroke-width="1.6"/>`),
  carousel: art(`
    <path class="b" d="M9 14l1.5 3 3 .5-2.2 2 .5 3-2.8-1.4-2.8 1.4.5-3-2.2-2 3-.5ZM54 22l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M32 6 10 22h44Z"/>
    <path class="c" d="M31 1h1.6v6H31Z"/><path class="c" d="M32.6 1.2 38 3l-5.4 2Z"/>
    <path class="a" d="M10 22h44v3c0 2-2.5 3.5-5.5 3.5S43 27 43 25c0 2-2.5 3.5-5.5 3.5S32 27 32 25c0 2-2.5 3.5-5.5 3.5S21 27 21 25c0 2-2.5 3.5-5.5 3.5S10 27 10 25Z"/>
    <path class="a" d="M14 28h2.2v22H14Zm16.9 0h2.2v22h-2.2Zm16.9 0H50v22h-2.2Z"/>
    <path class="a" d="M8 50h48v3H8Z"/>
    <path class="h" d="M24 38c1.5-2.5 6-3 8.5-1.5l3 .5c1 0 1.5 1 1 2l-1 .2-1.6 3h-1.6l.6-2.6h-5.8l-.8 2.6h-1.6l.4-2.8c-1 .2-1.6-.2-1.1-1.4Z"/>`),
  clapper: art(`
    <path class="b" d="M4 8h10v48H4Zm46 0h10v48H50Z"/>
    <path class="h" d="M6 12h6v4H6Zm0 8h6v4H6Zm0 8h6v4H6Zm0 8h6v4H6Zm0 8h6v4H6Zm46-32h6v4h-6Zm0 8h6v4h-6Zm0 8h6v4h-6Zm0 8h6v4h-6Zm0 8h6v4h-6Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <rect class="a" x="16" y="28" width="32" height="24" rx="2"/>
    <path class="a" d="m15 26 30-9 2 6-30 7.5Z"/>
    <path class="h" d="m21 24.5 5-5.8 3.6-1-5 5.8Zm9-2.7 5-5.8 3.6-1-5 5.8Zm9-2.7 4.6-5.3 1.4 4.6-2.4.7Z"/>
    <path class="h" d="M21 36h22v2H21Zm0 6h14v2H21Z"/>
    <path class="c" d="M50 34l1.4 2.8 3 .4-2.2 2.1.6 3-2.8-1.5-2.8 1.5.6-3-2.2-2.1 3-.4Z"/>`),
  bridge: art(`
    <circle class="c" cx="32" cy="22" r="7"/>
    <path class="b" d="M0 44c8-6 16-8 24-6s16-6 24-6 12 4 16 6v18H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M16 12h4v42h-4Zm28 0h4v42h-4Z"/>
    <path class="a" d="M15 11h6v3h-6Zm28 0h6v3h-6Z"/>
    <path class="a" d="M0 40h64v3.5H0Z"/>
    <path class="a" d="M2 39C8 35 14 27 18 13c4 13 9 18 14 22 5-4 10-9 14-22 4 14 10 22 16 26l-.8 1C55 36 50 29 46 18c-4 10-8 15-14 19.2C26 33 22 28 18 18 14 29 9 36 2.8 40Z"/>
    <path class="h" d="M0 50c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke-width="1.6"/>`),
  lighthouse: art(`
    <circle class="c" cx="52" cy="32" r="5"/>
    <path class="b" d="M0 50c6-4 12-6 18-5l6-5h16l6 5c6-1 12 1 18 5v14H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M26.5 50 28.6 18h6.8l2.1 32Z"/>
    <path class="h" d="M27.6 30h8.8M27 40h10" fill="none" stroke-width="2.2"/>
    <path class="a" d="M27 15h10v3H27Z"/>
    <path class="c" d="M28.5 10h7v5h-7Z"/>
    <path class="a" d="M27 10.5 32 5l5 5.5Z"/>
    <path class="c" d="M21 11 9 7v8Zm22 0 12-4v8Z" opacity=".55"/>
    <path class="a" d="M22 50h20v3H22Z"/>
    <path class="h" d="M0 58c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke-width="1.6"/>`),
  bloom: art(`
    <circle class="c" cx="51" cy="14" r="6"/>
    <path class="b" d="M0 50c10-6 22-8 34-6s22-2 30-6v18H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M30 56V38l-7-7 2-2 6 6v-9h3v12l6-6 2 2-8 8v14Z"/>
    <circle class="a" cx="22" cy="24" r="8"/><circle class="a" cx="33" cy="17" r="9"/><circle class="a" cx="44" cy="25" r="8"/><circle class="a" cx="31" cy="29" r="7"/>
    <circle class="h" cx="20" cy="22" r="1.4"/><circle class="h" cx="31" cy="14" r="1.4"/><circle class="h" cx="37" cy="20" r="1.4"/><circle class="h" cx="46" cy="23" r="1.4"/><circle class="h" cx="27" cy="28" r="1.4"/><circle class="h" cx="25" cy="18" r="1.2"/><circle class="h" cx="41" cy="28" r="1.2"/>
    <circle class="a" cx="12" cy="50" r="1.6"/><circle class="a" cx="50" cy="48" r="1.6"/><circle class="a" cx="55" cy="51" r="1.3"/>`),
  beach: art(`
    <circle class="c" cx="14" cy="15" r="7"/>
    <rect class="b" x="0" y="40" width="64" height="16"/>
    <path class="h" d="M0 44c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke-width="1.6"/>
    <path class="g" d="M0 52c12-4 30-5 64-2v14H0Z"/>
    <path class="a" d="M37 22h2l3 34h-2Z"/>
    <path class="a" d="M20 30c3-12 18-17 30-12 5 2 9 6 10 11-5-3-10-3-14 0-3-3-8-4-12-1-4-2-10-1-14 2Z"/>
    <path class="h" d="M33 28c1-6 4-10 9-12-3 3-5 7-6 12Z"/>
    <path class="a" d="M10 54h14l-2 3H12Z"/>`),
  grapes: art(`
    <circle class="c" cx="50" cy="14" r="6"/>
    <path class="b" d="M0 46c10-5 20-6 32-4s22-2 32-5v19H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M31 9c1 3 1 6 0 9h-2c1-3 1-6 0-9Z"/>
    <path class="a" d="M31 13c4-6 12-7 17-3-6 0-11 2-15 6Z"/>
    <circle class="a" cx="24" cy="23" r="5"/><circle class="a" cx="34" cy="22" r="5"/><circle class="a" cx="29" cy="31" r="5"/><circle class="a" cx="39" cy="31" r="5"/><circle class="a" cx="19" cy="32" r="5"/><circle class="a" cx="24" cy="40" r="5"/><circle class="a" cx="34" cy="40" r="5"/><circle class="a" cx="29" cy="48" r="5"/>
    <circle class="h" cx="22" cy="21" r="1.3"/><circle class="h" cx="32" cy="20" r="1.3"/><circle class="h" cx="27" cy="29" r="1.3"/><circle class="h" cx="37" cy="29" r="1.3"/><circle class="h" cx="17" cy="30" r="1.3"/><circle class="h" cx="22" cy="38" r="1.3"/><circle class="h" cx="32" cy="38" r="1.3"/><circle class="h" cx="27" cy="46" r="1.3"/>`),
  mission: art(`
    <circle class="c" cx="49" cy="15" r="6"/>
    <path class="b" d="M0 48c10-8 20-10 30-8s22-8 34-4v20H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M21 56V26h22v30Z"/>
    <path class="a" d="M19 24h26v3H19Zm5-9h16v9H24Zm4-7h8v7h-8Z"/>
    <path class="a" d="M32 2.5c3.2 0 4.6 2.6 4.6 5.5h-9.2c0-2.9 1.4-5.5 4.6-5.5Z"/>
    <path class="h" d="M28 24v-5a4 4 0 0 1 8 0v5Zm-1 26V40a5 5 0 0 1 10 0v10Z"/>
    <path class="c" d="M29.5 22.5c0-2.6 1-4 2.5-4s2.5 1.4 2.5 4Z"/>
    <path class="a" d="M17 54h30v2H17Z"/>`),
  mountains: art(`
    <circle class="c" cx="47" cy="15" r="7"/>
    <path class="b" d="M0 44 14 26l9 10 10-14 14 16 7-6 10 10v14H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M2 56 22 22l12 18 7-9 21 25Z"/>
    <path class="h" d="m22 22 5.5 8.4-2.5-1.6-3 2.6-2.4-2.4-3 1.6Zm19 9 4.6 5.4-2-.8-2.4 1.8-2-1.6-1.6.6Z"/>`),
  whale: art(`
    <circle class="c" cx="51" cy="13" r="6"/>
    <path class="b" d="M0 48h64v8H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M3 41c0-7 8-12 19-12 9 0 15 3 20 7.5L50 26c1.8-1.4 4.4.2 3.6 2.6L50 35.4l7.6 1.4c2.2.6 2 3.6-.4 3.8l-9.8-.4C43 45 34 48 23 48 11 48 3 46 3 41Z"/>
    <path class="h" d="M6 43.5c6 2.4 17 3 27 1-3 2-8 3-13 3-7 0-12-1.6-14-4Z"/>
    <circle class="h" cx="12" cy="37" r="1.3"/>
        <path class="b" d="M19 27c-.4-4-3-6.5-6-7.5 2.8-.2 5 1 6.6 3 1.2-2.4 3.4-4 6.4-4-2.8 1.6-4.6 4.4-5 8.5Z"/>
    <path class="h" d="M2 53c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke-width="1.6"/>`),
  balloon: art(`
    <circle class="c" cx="14" cy="14" r="6"/>
    <path class="b" d="M44 16c0-3 2.4-5 5-5 2 0 3.6 1.2 4.4 3 .4-.2 1-.3 1.6-.3 2.2 0 4 1.7 4 3.8H44Zm-36 18c0-2.6 2-4.4 4.4-4.4 1.8 0 3.2 1 3.8 2.6l1.4-.2c2 0 3.4 1.4 3.4 3.2H8Z"/>
    <path class="b" d="M0 50c10-4 22-5 32-3s22 0 32-3v12H0Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M32 4c-11 0-18 8-18 17 0 10 10 15 14 21h8c4-6 14-11 14-21 0-9-7-17-18-17Z"/>
    <path class="h" d="M32 4c-5 4-7.4 10-7.4 17 0 8 2.8 14 3.4 21h1.6c-.4-7-2.6-13-2.6-21 0-7 2-12.6 5-17Zm0 0c5 4 7.4 10 7.4 17 0 8-2.8 14-3.4 21h-1.6c.4-7 2.6-13 2.6-21 0-7-2-12.6-5-17Z"/>
    <path class="a" d="M28 42h1.4v5H28Zm6.6 0H36v5h-1.4Z"/>
    <rect class="c" x="27" y="47" width="10" height="6" rx="1"/>`),
  heli: art(`
    <circle class="c" cx="50" cy="13" r="6"/>
    <path class="b" d="M0 56V40h6v-8h7v10h6v-6h6v20Zm42 0V36h6v-6h6v8h5v-4h5v22Z"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="a" d="M10 16h40v2.4H10Zm19 2h2.4v5H29Z"/>
    <path class="a" d="M19 37c0-8 7-14 15-14 7 0 12 5 12 11v4c0 2.4-1.6 4-4 4H23c-2.4 0-4-1.8-4-4Z"/>
    <path class="h" d="M35 25.4c4.6.6 8 4 8.4 8.6H35Z"/>
    <path class="a" d="M20 33H6l-2-6h2.6l2 3.4H20Z"/>
    <path class="a" d="M24 42h2.2v5H24Zm14 0h2.2v5H38Zm-17 5h27c1.4 0 2.4-.6 3.2-1.8l1.8.8c-1.2 2-3 3.2-5 3.2H21Z"/>`),
  wave: art(`
    <circle class="c" cx="50" cy="14" r="6"/>
    <rect class="g" x="0" y="56" width="64" height="8"/>
    <path class="b" d="M0 48c6 0 8-3 14-3s8 3 14 3 8-3 14-3 8 3 14 3 6-2 8-2v10H0Z"/>
    <path class="a" d="M4 46c9 0 12-8 12-16C16 18 25 9 36 9c9 0 16 7 16 15 0 7-5 12-12 12-5.4 0-9.6-4-9.6-8.6 0-3.4 2.6-6 5.8-6 2.8 0 4.8 2 4.8 4.6 0-5-4-8.6-9.4-8.6C24 17.4 20 25 20 32c0 6 3 11 8 14Z"/>
    <path class="h" d="M24 30c0-5 2.6-9 6-10.6-2 2.8-3 6.4-3 10.6 0 4 1.4 7.6 4 10-4-1-7-5-7-10Z"/>`),
  sun: art(`
    <path class="b" d="M6 56V34c0-1 1-2 2-2s2 1 2 2v22Zm48 0V30c0-1 1-2 2-2s2 1 2 2v26Z"/>
    <path class="b" d="M8 33c-3-3-7-3-8-1 3-.4 5 .4 7 2Zm.4-.6c.6-3 3-5 6-5-2 1.4-3.6 3.2-4.4 5.4ZM56 29c-3-3-7-3-8-1 3-.4 5 .4 7 2Zm.4-.6c.6-3 3-5 6-5-2 1.4-3.6 3.2-4.4 5.4Z"/>
    <path class="c" d="M14 44a18 18 0 0 1 36 0Z"/>
    <path class="c" d="M31 12h2v6h-2Zm-15.4 6.6 1.4-1.4 4.2 4.2-1.4 1.4Zm31.4-1.4 1.4 1.4-4.2 4.2-1.4-1.4ZM6 34v-2h6v2Zm46 0v-2h6v2Z"/>
    <path class="a" d="M0 44h64v3H0Z"/>
    <path class="g" d="M8 50h48v2.4H8Zm8 5h32v2.4H16Z"/>
    <rect class="g" x="0" y="60" width="64" height="4"/>`),
};

const ui = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const UI = {
  check: ui('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  plus: ui('<path d="M12 5v14M5 12h14"/>'),
  minus: ui('<path d="M5 12h14"/>'),
  close: ui('<path d="M6 6l12 12M18 6 6 18"/>'),
  arrow: ui('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: ui('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  down: ui('<path d="m6 9 6 6 6-6"/>'),
  up: ui('<path d="m6 15 6-6 6 6"/>'),
  trip: ui('<path d="M4 7h16v12H4z"/><path d="M9 7V5h6v2M4 12h16"/>'),
  link: ui('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  download: ui('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  plan: ui('<path d="M5 6h14M5 12h14M5 18h9"/>'),
  telegram: ui('<path d="M21 4 3 11l6 2 2 6 3-4 5 4 2-15Z"/><path d="m9 13 8-6"/>'),
  whatsapp: ui('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9Z"/>'),
  phone: ui('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/>'),
};
