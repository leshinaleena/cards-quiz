// Яндекс Метрика + UTM-метки
let counterId = null;
const debug = new URLSearchParams(location.search).has('debug');

export function initAnalytics(cfg = {}) {
  counterId = Number(cfg.metrikaId) || null;
  if (!counterId) return;
  /* eslint-disable */
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for (let j = 0; j < e.scripts.length; j++) if (e.scripts[j].src === r) return;
    k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
  /* eslint-enable */
  window.ym(counterId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
}

export function track(goal, params) {
  if (!goal) return;
  if (debug) console.info('[metrika]', goal, params || '');
  try {
    if (counterId && window.ym) window.ym(counterId, 'reachGoal', goal, params);
  } catch (_) { /* аналитика не должна ломать сайт */ }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const STORE_KEY = 'tr_quiz_utm';

// UTM из ссылки; если их нет — из сессии (на случай перезагрузки страницы)
export function getUtm() {
  const params = new URLSearchParams(location.search);
  const utm = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }
  if (Object.keys(utm).length) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(utm)); } catch (_) {}
    return utm;
  }
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; }
}
