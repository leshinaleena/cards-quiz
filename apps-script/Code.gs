/**
 * Приёмник заявок с квиза TOP RIDERS → Google Таблица.
 * Установка (один раз): откройте таблицу «TOP RIDERS — заявки с квиза» →
 * Расширения → Apps Script → вставьте этот код → Развернуть → Новое развёртывание →
 * тип «Веб-приложение», «Запуск от имени: я», «Доступ: все» → скопируйте URL
 * и вставьте его в config.json → leads.endpoint.
 *
 * Столбцы берутся из первой строки таблицы: значение кладётся в столбец
 * с тем же названием, что и поле заявки. Новые столбцы можно добавлять.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    if (data.website) return out_('ok');            // ловушка для ботов
    if (!data['Телефон'] && !data['Email']) return out_('empty');

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) {
      if (h === 'Дата и время') return new Date();
      var v = data[h] == null ? '' : String(data[h]).slice(0, 1000);
      return /^[=+\-@]/.test(v) ? "'" + v : v;       // защита от формул в ячейках
    });
    sheet.appendRow(row);
    return out_('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return out_('TOP RIDERS leads endpoint'); }

function out_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
