// Логика подбора. Все правила берутся из config.json:
//   option.match    — условие по параметру карты (см. evalMatch)
//   option.points   — сколько баллов даёт совпадение (по умолчанию 1)
//   option.required — при явном несовпадении карта исключается
//   card.weights[questionId][optionId] — ручные баллы карты за конкретный ответ

const PLACEHOLDER = /^_+$/;

export const isEmpty = (v) =>
  v === null || v === undefined ||
  (typeof v === 'string' && (v.trim() === '' || PLACEHOLDER.test(v.trim()))) ||
  (Array.isArray(v) && v.length === 0);

// true — совпало, false — точно не совпало, null — параметр не заполнен
export function evalMatch(card, rule) {
  if (!rule) return null;
  if (rule.any || rule.all) {
    const res = (rule.any || rule.all).map((r) => evalMatch(card, r));
    if (rule.any) {
      if (res.includes(true)) return true;
      return res.length && res.every((r) => r === false) ? false : null;
    }
    if (res.includes(false)) return false;
    return res.length && res.every((r) => r === true) ? true : null;
  }

  const v = card[rule.field];
  if (isEmpty(v)) return null;

  if ('equals' in rule) return v === rule.equals;
  if ('includes' in rule) return Array.isArray(v) ? v.includes(rule.includes) : String(v).includes(rule.includes);
  if ('includesAny' in rule) return Array.isArray(v) && rule.includesAny.some((x) => v.includes(x));
  if ('minLength' in rule) return Array.isArray(v) && v.length >= rule.minLength;
  if ('lte' in rule || 'gte' in rule) {
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return (!('lte' in rule) || n <= rule.lte) && (!('gte' in rule) || n >= rule.gte);
  }
  return null;
}

export function scoreCard(card, answers, questions) {
  let score = 0;
  let excluded = false;
  for (const q of questions) {
    for (const optId of answers[q.id] || []) {
      const opt = q.options.find((o) => o.id === optId);
      if (!opt) continue;
      const w = card.weights?.[q.id]?.[optId];
      if (typeof w === 'number') score += w;
      const ok = evalMatch(card, opt.match);
      if (ok === true) score += opt.points ?? 1;
      if (ok === false && opt.required) excluded = true;
    }
  }
  return { score, excluded };
}

// Возвращает { status: 'ok' | 'none', items: [{ card, score, alternative? }] }
export function pickCards(config, answers) {
  const { minScore = 1, maxResults = 3 } = config.scoring || {};
  const scored = config.cards
    .filter((c) => c.active !== false)
    .map((card, i) => ({ card, i, ...scoreCard(card, answers, config.questions) }))
    .sort((a, b) => b.score - a.score || (b.card.priority || 0) - (a.card.priority || 0) || a.i - b.i);

  const fits = scored.filter((x) => !x.excluded && x.score >= minScore);
  if (!fits.length) return { status: 'none', items: [] };

  if (fits.length === 1) {
    // Одна подходящая карта: добавляем ближайшую альтернативу
    const rest = scored.filter((x) => x !== fits[0]);
    const alt = rest.find((x) => !x.excluded) || rest[0];
    return { status: 'ok', items: alt ? [fits[0], { ...alt, alternative: true }] : [fits[0]] };
  }
  return { status: 'ok', items: fits.slice(0, Math.max(2, maxResults)) };
}
