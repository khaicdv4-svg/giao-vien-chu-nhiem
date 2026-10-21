'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const imp=require('../app/review-import.js');
const raw=`TRƯỜNG TH TRẦN VĂN ƠN
KTĐK CUỐI HKI - NĂM HỌC 2026 - 2027
MÔN TIẾNG VIỆT - Lớp 4
…/0,5 đ
Câu 1. Từ nào là danh từ?
A. chạy       B. con mèo       C. đẹp       D. hát
…/1 đ
Câu 2. Đặt tính rồi tính:
a) 12 345 + 6 789
······································
b) 50 000 − 1 234
…/1,5 đ
Câu 3. Viết một câu có danh từ riêng.
……………………………………………
ĐÁP ÁN
Câu 1
B. con mèo
Câu 2. (1 điểm)
a) 19 134
b) 48 766
Câu 3. HS viết đúng câu có danh từ riêng viết hoa: 1,5 điểm.`;
test('mẫu đề của trường: điểm, đáp án, tách đặt tính, môn/chủ đề, hướng dẫn chấm',()=>{
  const r=imp.schoolTemplate(raw);
  assert.deepEqual(r.meta,{grade:4,subject:'Tiếng Việt',topic:'Kiểm tra cuối học kì I'});
  assert.deepEqual(r.questions.map(q=>[q.id,q.type,q.points]),[['cau-1','ABCD',0.5],['cau-2a','OPEN',0.5],['cau-2b','OPEN',0.5],['cau-3','OPEN',1.5]]);
  assert.deepEqual(r.questions[0].options,['chạy','con mèo','đẹp','hát']);assert.deepEqual(r.questions[0].correctAnswers,[1]);
  assert.equal(r.questions[1].text,'Câu 2a. Đặt tính rồi tính: 12345 + 6789');assert.equal(r.questions[1].metadata.answerLayout,'grid-calculation');
  assert.match(r.questions[1].explanation,/19 134/);assert.match(r.questions[3].explanation,/1,5 điểm/);
  assert.doesNotMatch(r.questions[3].text,/……………/);
});
test('không có phần ĐÁP ÁN hoặc dưới 2 câu thì không áp dụng (giữ cách nhập cũ)',()=>{
  assert.equal(imp.schoolTemplate('Câu 1. 1 + 1 = ?\nA. 1  B. 2'),null);
  assert.equal(imp.schoolTemplate('Câu 1. 1 + 1 = ?\nA. 1  B. 2\nĐÁP ÁN\nCâu 1 B'),null);
});
