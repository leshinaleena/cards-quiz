# TOP RIDERS · Лос-Анджелес

Мини-сайт: подбор экскурсий, план с ценой, райдеры, отправка плана менеджеру и открытка-подарок.

## Где что менять

| Что | Где |
|---|---|
| Тексты, цены, экскурсии, сезоны, контакты | `config.json` |
| Фото | `assets/photos/` (AVIF, WebP, JPG) |
| Стили | `assets/css/la.css` |
| Иллюстрации | `assets/js/icons.js` |
| Разметка карточек, маршрутов, вопросов | `assets/js/render.js` |
| Памятки-подарки для менеджера | `memos/` |

После правки `config.json` запустите `node la/tools/prerender.mjs` — он впишет экскурсии, маршруты и вопросы прямо в `index.html` (для поисковиков). Автотест проверяет, что это не забыто.

После правки `config.json`, CSS или JS увеличьте версию `?v=` в `index.html` и `VERSION` в `assets/js/app.js` — иначе телефон может показать старое из кэша.

## Подключить

- **Google Таблица:** `apps-script/Code.gs`, инструкция в начале файла → URL в `config.json → leads.endpoint`.
- **Яндекс Метрика:** номер счётчика в `config.json → analytics.metrikaId`. Цели: quiz_start, quiz_done, excursion_add, rider_calc, plan_open, lead_tg, lead_wa, lead_call, gift_save.

## Проверка

```
cd la && python3 -m http.server 8790
node tests/smoke.mjs http://localhost:8790/
```
