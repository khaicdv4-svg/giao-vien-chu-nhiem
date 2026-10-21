/**
 * HỌC MÀ VUI – Nhận bài làm trực tuyến vào Google Trang tính của giáo viên.
 * Dán toàn bộ đoạn mã này vào Tiện ích mở rộng → Apps Script của Trang tính, rồi Triển khai → Ứng dụng web.
 * Mỗi bài nộp thành một dòng trong trang "Bài nộp". Bài gửi lại trùng mã nộp sẽ không bị ghi hai lần.
 */
const SHEET_NAME = 'Bài nộp';
const HEADERS = ['Thời gian nhận', 'Họ và tên', 'Tên đề', 'Mã đề', 'Phiên bản đề', 'Mã lượt làm', 'Mã nộp bài',
  'Điểm tự chấm', 'Điểm tối đa tự chấm', 'Số câu chờ chấm', 'Điểm tối đa chờ chấm', 'Dữ liệu bài làm (JSON)'];
const MAX_CELL = 49000;

function doGet() {
  return json_({ ok: true, service: 'HOC MA VUI – nhan bai' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (data.kind !== 'hmv-online-submission' || !text_(data.submissionId) || !text_(data.documentId)) return json_({ ok: false, error: 'invalid' });
    const name = text_(data.studentName).slice(0, 80);
    if (!name) return json_({ ok: false, error: 'name' });
    const sheet = sheet_();
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, 7, last - 1, 1).getValues().map(r => String(r[0])) : [];
    if (ids.indexOf(text_(data.submissionId)) >= 0) return json_({ ok: true, duplicate: true });
    const results = Array.isArray(data.results) ? data.results : [];
    const graded = results.filter(r => r && r.status === 'graded');
    const pending = results.filter(r => r && r.status === 'pending-manual');
    const sum = (list, key) => list.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const raw = JSON.stringify(data);
    sheet.appendRow([new Date(), safe_(name), safe_(text_(data.title).slice(0, 200)), safe_(text_(data.documentId)), Number(data.documentVersion) || 1,
      safe_(text_(data.attemptId)), safe_(text_(data.submissionId)), round_(sum(graded, 'points')), round_(sum(graded, 'maxPoints')),
      pending.length, round_(sum(pending, 'maxPoints')), raw.length > MAX_CELL ? raw.slice(0, MAX_CELL) + ' …(bị cắt)' : raw]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

function sheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) { sheet.appendRow(HEADERS); sheet.setFrozenRows(1); }
  return sheet;
}
function text_(v) { return String(v == null ? '' : v).trim(); }
// Chặn công thức: nội dung bắt đầu bằng = + - @ được ghi như chữ.
function safe_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function round_(v) { return Math.round(v * 100) / 100; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
