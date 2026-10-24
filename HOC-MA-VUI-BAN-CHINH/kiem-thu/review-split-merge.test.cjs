const test = require('node:test');
const assert = require('node:assert');
const { splitLargeContent, mergeResults } = require('../app/review-split-merge.js');

test('GĐ2: Chia content nhỏ — không chia', () => {
  const small = Buffer.alloc(1000).toString('base64');
  const chunks = splitLargeContent(small, 9 * 1024 * 1024);
  assert.equal(chunks.length, 1, 'Content nhỏ phải giữ nguyên');
  assert.equal(chunks[0].index, 1);
  console.log('✓ Không chia content < 9MB');
});

test('GĐ2: Chia content lớn 18MB — thành 2 chunk', () => {
  const large = Buffer.alloc(18 * 1024 * 1024).toString('base64');
  const chunks = splitLargeContent(large, 9 * 1024 * 1024);
  assert.equal(chunks.length, 2, '18MB phải chia 2 chunk');
  assert.equal(chunks[0].index, 1);
  assert.equal(chunks[1].index, 2);
  console.log('✓ Chia 18MB → 2 chunks');
});

test('GĐ2: Ghép kết quả từ nhiều chunk', () => {
  const results = [
    { index: 1, questions: [{id: 'q1'}, {id: 'q2'}], blocks: [{id: 'b1'}] },
    { index: 2, questions: [{id: 'q3'}], blocks: [{id: 'b2'}] }
  ];
  const merged = mergeResults(results);
  assert.equal(merged.questions.length, 3, 'Phải ghép 3 câu');
  assert.equal(merged.blocks.length, 2, 'Phải ghép 2 block');
  assert.equal(merged.totalPages, 2);
  console.log('✓ Ghép 2 chunk → 3 câu, 2 block');
});

test('GĐ2: Ghép không trùng ID', () => {
  const results = [
    { index: 1, questions: [{id: 'q1'}, {id: 'q2'}] },
    { index: 2, questions: [{id: 'q1'}, {id: 'q3'}] } // q1 trùng
  ];
  const merged = mergeResults(results);
  assert.equal(merged.questions.length, 3, 'Phải loại trùng (q1)');
  console.log('✓ Không trùng ID khi ghép');
});

test('GĐ2: Sắp xếp theo index khi ghép', () => {
  const results = [
    { index: 3, questions: [{id: 'q3'}] },
    { index: 1, questions: [{id: 'q1'}] },
    { index: 2, questions: [{id: 'q2'}] }
  ];
  const merged = mergeResults(results);
  assert.equal(merged.questions[0].id, 'q1', 'Phải sắp xếp theo index');
  assert.equal(merged.questions[2].id, 'q3');
  console.log('✓ Sắp xếp theo index');
});
