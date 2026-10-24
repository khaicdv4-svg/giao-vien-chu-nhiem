const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const fixtureFile = path.join(__dirname, 'fixtures', 'review-tiengviet4-doc-hieu.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf-8'));

const html = require('../review-html.cjs');

const mockDomain = `window.domain={submitAttempt:async()=>({status:'graded',score:5.5,maxScore:11})};`;

test('GĐ1: HTML có tất cả thành phần cần thiết cho mẫu reading', () => {
  const out = html.renderHtml(fixture, mockDomain);
  
  // 1. Danh sách xem lại
  assert(out.includes('reading-review-btn'), 'Phải có reading-review-btn');
  assert(out.includes('data-question-index="0"'), 'Phải có data-question-index');
  
  // 2. Lời khuyên
  assert(out.includes('reading-hint'), 'Phải có reading-hint');
  assert(out.includes('💡'), 'Phải có emoji gợi ý');
  
  // 3. Nút in
  assert(out.includes('🖨️ In kết quả'), 'Phải có nút in');
  
  // 4. Nút "Làm lại bài"
  assert(out.includes('🔁 Làm lại bài'), 'Phải có nút làm lại');
  assert(out.includes('id="retry"'), 'Phải có id retry');
  
  // 5. Form reset logic
  assert(out.includes('form.reset()'), 'Phải có form.reset()');
  assert(out.includes('scrollIntoView'), 'Phải có scroll');
  
  // 6. @media print
  assert(out.includes('@media print'), 'Phải có @media print');
  assert(out.includes('display:none'), 'Print phải ẩn nút');
  
  // 7. Không có location.reload
  assert(!out.includes('location.reload()'), 'Không được dùng location.reload()');
  
  console.log('✓ HTML structure đúng');
});

test('GĐ1: Fixture có đủ dữ liệu để test', () => {
  assert(fixture.questions.length === 11, 'Phải có 11 câu');
  
  const openQuestions = fixture.questions.filter(q => q.type === 'OPEN');
  assert(openQuestions.length > 0, 'Phải có câu OPEN');
  openQuestions.forEach(q => {
    assert(q.metadata?.hint, 'Câu OPEN phải có hint');
  });
  
  console.log(`✓ Fixture: ${fixture.questions.length} câu, ${openQuestions.length} câu OPEN có hint`);
});
