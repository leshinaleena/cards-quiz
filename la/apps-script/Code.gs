/**
 * Приёмник событий мини-сайта TOP RIDERS · Лос-Анджелес → Google Таблица, лист «LA».
 * Имя и контакты сюда НЕ приходят: они уходят только в сообщении, которое клиент сам отправляет в мессенджер.
 *
 * Установка (один раз, с компьютера):
 * 1. Откройте таблицу заявок → Расширения → Apps Script → создайте файл и вставьте этот код.
 * 2. Развернуть → Новое развёртывание → тип «Веб-приложение», «Запуск от имени: я», «Доступ: все».
 * 3. Скопируйте URL и вставьте в la/config.json → leads.endpoint.
 * Лист «LA» с заголовками создастся сам при первом событии.
 */
var HEADERS = ['Дата и время', 'Событие', 'С кем', 'Дней', 'Интересы', 'Группа', 'Подобрано', 'План', 'Сумма', 'Райдер', 'Месяц', 'Канал', 'UTM', 'Страница'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('LA') || ss.insertSheet('LA');
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    var row = HEADERS.map(function (h) {
      if (h === 'Дата и время') return new Date();
      var v = data[h] == null ? '' : String(data[h]).slice(0, 500);
      return /^[=+\-@]/.test(v) ? "'" + v : v;   // защита от формул в ячейках
    });
    sheet.appendRow(row);
    return out_('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return out_('TOP RIDERS LA endpoint'); }

function out_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
