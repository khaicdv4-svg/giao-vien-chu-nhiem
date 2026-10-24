'use strict';
// Mẫu "Hành trình đọc hiểu" cho Tiếng Việt: tự chọn khi có bài đọc, chọn tay được, mặc định vẫn là phiếu pastel.
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('../review-html.cjs');
const fixture=require('./fixtures/review-tiengviet4-doc-hieu.json');
const clone=o=>JSON.parse(JSON.stringify(o));
test('Tiếng Việt có bài đọc tự dùng mẫu đọc hiểu',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/data-theme="reading"/);assert.match(out,/CÙNG ĐỌC/);assert.match(out,/HÀNH TRÌNH ĐỌC HIỂU/);
 assert.match(out,/Gợi ý để em tự làm/);assert.equal((out.match(/<script/g)||[]).length,2);
});
test('chọn tay mẫu phiếu luyện tập vẫn được',()=>{
 const d=clone(fixture);d.metadata=Object.assign({},d.metadata,{htmlTheme:'worksheet'});
 assert.match(html.renderHtml(d),/data-theme="worksheet"/);
});
test('môn khác mặc định phiếu luyện tập',()=>{
 const d=clone(fixture);d.metadata=Object.assign({},d.metadata,{subject:'Toán'});
 assert.match(html.renderHtml(d),/data-theme="worksheet"/);
});
test('GĐ1: mẫu reading có danh sách xem lại câu với data-question-index',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/data-question-index="0"/);
 assert.match(out,/data-question-index="10"/);
 assert.match(out,/reading-review-section/);
 assert.match(out,/📋 Xem lại bài làm/);
});
test('GĐ1: mẫu reading có lời khuyên từ metadata.hint cho câu OPEN',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/reading-hint/);
 assert.match(out,/💡.*Gợi ý/);
});
test('GĐ1: mẫu reading có nút in kết quả',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/🖨️ In kết quả/);
});
test('GĐ1: CSS @media print ẩn danh sách xem lại',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/@media print/);
 assert.match(out,/display:none.*important/);
});
