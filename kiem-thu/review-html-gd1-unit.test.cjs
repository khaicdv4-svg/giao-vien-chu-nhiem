const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const fixtureFile = path.join(__dirname, '..', 'HOC-MA-VUI-BAN-CHINH', 'kiem-thu', 'fixtures', 'review-tiengviet4-doc-hieu.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf-8'));

// Load review-html.js từ app/
const reviewHtmlModule = require('../HOC-MA-VUI-BAN-CHINH/app/review-html.js');

// Mock domain source (đơn giản)
const mockDomain = `
(function() {
  window.domain = {
    submitAttempt: async (answers) => {
      return { status: 'graded', score: 5.5, maxScore: 11, answers };
    }
  };
})();
`;

test('GĐ1 — HTML có nút "🔁 Làm lại bài"', () => {
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  assert(html.includes('🔁 Làm lại bài'), 'Nút "🔁 Làm lại bài" phải có trong HTML');
  assert(html.includes('id="retry"'), 'ID "retry" phải có');
});

test('GĐ1 — HTML có danh sách xem lại (reading-review-btn)', () => {
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  assert(html.includes('reading-review-btn'), 'Class "reading-review-btn" phải có');
  assert(html.includes('Câu'), 'Danh sách phải chứa "Câu"');
});

test('GĐ1 — HTML có data-question-index trên fieldset', () => {
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  assert(html.includes('data-question-index="0"'), 'fieldset phải có data-question-index="0"');
  assert(html.includes('data-question-index="1"'), 'fieldset phải có data-question-index="1"');
});

test('GĐ1 — HTML có CSS @media print ẩn nút', () => {
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  assert(html.includes('@media print'), '@media print phải có');
  assert(html.includes('button:not(.reading-review-btn),#music-toggle,.submit-panel'), 'CSS print phải ẩn nút submit');
});

test('GĐ1 — attempt.reading và attempt.theme được gán', () => {
  // Tạo HTML để kiểm tra attempt object
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  // Chuỗi `attempt.reading=true` phải có trong script inline
  assert(html.includes('attempt.reading=') || html.includes('attempt.reading=true'), 
    'Script phải set attempt.reading');
});

test('GĐ1 — Retry button có event listener (logic reset)', () => {
  const html = reviewHtmlModule.renderHtml(fixture, mockDomain);
  // Kiểm tra dòng addEventListener trong script
  assert(html.includes('retryButton.addEventListener'), 'retryButton.addEventListener phải có');
  assert(html.includes('form.reset()'), 'form.reset() phải được gọi khi click Làm lại');
});
