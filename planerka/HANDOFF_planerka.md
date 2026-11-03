# Планёрка в боте: передача (на 03.11.2026)

Проект: Apps Script «Бот Секретутка» на Диске Лен, файл planerka.gs, команда /planerka [ДД.ММ] (по умолчанию вчера).
Задание и контекст: ЗАДАНИЕ_Claude_Code_Планёрка.md + «Контекст по Планёрке» (у Лен).
Правила: данные таблиц не выкачивать, расчёт делает бот, Лен проверяет в Telegram. Только 5 менеджеров. В таблицы не писать.

## Что есть в planerka.gs (работает, сверено)
- plnLeads_, plnPayments_, plnText_ — заявки воронки продаж и оплаты из «Единого реестра» (02.11: 157 500 ₽ + $175, заявки Рябко 8, Зубковская 8).
- plnSla_, plnSlaText_ — SLA по «Чатам», заявки без ответа.
- PLN_SHIFT, PLN_SRC, plnMgr_, plnActs_, plnPauses_, plnScale_, plnPauseText_ — паузы и шкала дня.
- Хелперы: plnDT_, plnId_, plnHM_, plnEvents_. Из «Кода»: CFG (MANAGERS, SALES_FUNNEL, LOST_STAGE='Сделка проиграна', AMO_URL), readDeals_ (поля d.closed, d.lossReason, d.stage...), lossTxt_, key_, fmtDate_, esc_, pct_, ending_, addDays_, toDate_, toNum_, sendLong_.
- Этап 4 вставлен: plnIsLate_, plnLate_, plnLosses_, plnLossText_ (J «Просрочена?» = «Да»/«Нет»).
  Сверка 29.10 с эталоном: выполнено задач Зубковская 84, Рябко 102, Адаева 12 — сошлось.

## Сделать сразу: заменить в planerka.gs две функции (код ниже)
plnLateText_ — сворачивает одинаковые задачи (тип+текст+минута) в «×N», помечает закрытие пачкой, в выходной только информация; убрана временная строка J.
sendPlanerka_ — паузы считаются один раз и передаются в plnLateText_.

```javascript
const PLN_BULK = 5;   // столько задач и больше за одну минуту считаем закрытием пачкой

/** P — результат plnPauses_ (оттуда берём выходной: works === false). */
function plnLateText_(day, R, P) {
  const L = ['<b>Задачи «выполнены с опозданием» за ' + fmtDate_(day) + '</b>'];
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const link = id => '<a href="' + CFG.AMO_URL + id + '">' + id + '</a>';
  let any = false;
  CFG.MANAGERS.forEach(m => {
    const o = R.byMgr[m.crm]; if (!o.done) return;
    any = true;
    const off = P && P[m.crm] && P[m.crm].works === false;
    const G = {}, order = [], perMin = {};
    o.late.forEach(x => {
      const min = plnHM_(x.t), k = min + '|' + x.type + '|' + cut(x.text, 60);
      perMin[min] = (perMin[min] || 0) + 1;
      if (!G[k]) { G[k] = { t: x.t, type: x.type, text: cut(x.text, 60), c: [], deals: [], n: 0 }; order.push(k); }
      const g = G[k]; g.n++;
      if (x.created) g.c.push(x.created);
      if (x.deal && g.deals.indexOf(x.deal) < 0) g.deals.push(x.deal);
    });
    if (off) {
      L.push('', '<b>' + esc_(m.short) + '</b> — ' + P[m.crm].off + '; выполнено ' + o.done + ', с опозданием ' + o.late.length + ', в работу не считаем');
      return;
    }
    const bulk = Object.keys(perMin).filter(k => perMin[k] >= PLN_BULK);
    const bulkN = bulk.reduce((a, k) => a + perMin[k], 0);
    L.push('', '<b>' + esc_(m.short) + '</b>: выполнено ' + o.done + ', из них с опозданием ' + o.late.length +
      (o.late.length ? ' (' + pct_(o.late.length / o.done) + ')' : ''));
    if (bulkN) L.push('⚠️ Закрыто пачкой (' + PLN_BULK + '+ за минуту): ' + bulkN + ' в ' + bulk.join(', '));
    order.slice(0, PLN_LATE_LIST).forEach(k => {
      const g = G[k], c = g.c.sort((a, b) => a - b);
      const cr = c.length ? (fmtDate_(c[0]) === fmtDate_(c[c.length - 1]) ? fmtDate_(c[0]) : fmtDate_(c[0]) + '–' + fmtDate_(c[c.length - 1])) : '';
      L.push('• ' + plnHM_(g.t) + (g.n > 1 ? ' ×' + g.n : '') + (cr ? ' (' + (g.n > 1 ? 'созданы ' : 'создана ') + cr + ')' : '') +
        ' ' + esc_(g.type || 'задача') + (g.text ? ': ' + esc_(g.text) : '') +
        (g.deals.length ? ' ' + g.deals.map(link).join(', ') : ''));
    });
    if (order.length > PLN_LATE_LIST) L.push('… и ещё ' + (order.length - PLN_LATE_LIST) + ' ' +
      ending_(order.length - PLN_LATE_LIST, 'строка', 'строки', 'строк'));
  });
  if (!any) L.push('— выполненных задач нет');
  return L.join('\n');
}

function sendPlanerka_(chat, day) {
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  const rows = readDeals_(ss.getSheetByName(CFG.SHEET_DATA), 40);
  const pay = plnPayments_(ss, day);
  const plan = readPlan_(ss.getSheetByName(CFG.SHEET_PLAN), day);
  const sched = readSchedule_(ss);
  const P = plnPauses_(day, sched);
  sendLong_(chat, plnText_(day, plnLeads_(rows, day), pay, plan) + '\n\n' + plnSlaText_(day, plnSla_(rows, day, pay)) +
    '\n\n' + plnPauseText_(day, P));
  sendLong_(chat, plnLateText_(day, plnLate_(day), P) + '\n\n' + plnLossText_(day, plnLosses_(rows, day)));
}
```

## Открытые вопросы к Лен
1. Системные задачи «Контроль ответа: При отправке автоматического сообщения возникла ошибки…» — считать опозданием менеджера или отдельной строкой «системные: N» вне процента?
2. «Новая заявка», выполненная с опозданием, поднимать в начало списка?
3. Пауза Рябко 29.10: у нас 76 мин, в эталоне «дольше часа не было» — причина не найдена.
4. Звонки Зубковской 02.11 = 0: подпись в «Звонках» узнаётся (29.10 — 8 звонков), скорее всего, 0 реальный; точно — запустить plnCheckCalls (если вставлена).

## Осталось сделать (по порядку)
1. Страны и продукты за день.
2. Акции за день + проверка цены: прайс («Прайс_TopRiders_A», «БЫСТРЫЙ ПРАЙС») × (1 − скидка Teyca) = «Сумма по чеку»; названия через «СЛОВАРЬ НАЗВАНИЙ» + «Справочник».
3. Всплески трафика: страна/запрос/акция против обычного дня, со ссылками.
4. Ошибки CRM со ссылками (без причины проигрыша, без акции, расхождение цены).
5. План/факт по менеджерам (план ноября пуст → «Ждём план»).
6. «Что обсудить» из всех блоков.
7. HTML по эталону ETALON_planerka_29-10-2026.html, шкала по часам с числом действий в квадратике; проверка на 430 и 1280 px.
8. Автоотправку не включать до утверждения Лен.
