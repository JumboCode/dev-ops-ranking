// Google Apps Script backend. Paste into Extensions > Apps Script of a Google Sheet.
// Stores one row per (round, name); resubmitting replaces the earlier row.

const SHEET_NAME = 'Rankings';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp', 'round', 'name', 'ranking']);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const round = e.parameter.round;
  const rows = getSheet().getDataRange().getValues().slice(1);
  const data = rows
    .filter(r => !round || r[1] === round)
    .map(r => ({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      round: r[1],
      name: r[2],
      ranking: JSON.parse(r[3]),
    }));
  return json(data);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const name = String(body.name || '').trim();
    const round = String(body.round || '');
    if (!name || !round || !Array.isArray(body.ranking)) {
      return json({ ok: false, error: 'Missing name, round, or ranking' });
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][1] === round && String(rows[i][2]).trim().toLowerCase() === name.toLowerCase()) {
        sheet.deleteRow(i + 1);
      }
    }
    sheet.appendRow([new Date().toISOString(), round, name, JSON.stringify(body.ranking)]);
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
