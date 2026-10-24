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
test('GĐ1: nút "🔁 Làm lại bài" có trong HTML',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/🔁 Làm lại bài/);
 assert.match(out,/id="retry"/);
});
test('GĐ1: nút retry có event listener với form.reset()',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/retryButton\.addEventListener/);
 assert.match(out,/form\.reset\(\)/);
});
test('GĐ1: nút retry có logic ẩn result-panel, hiện submit-panel',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/document\.querySelector\('\.result-panel'\)\.hidden=true/);
 assert.match(out,/document\.querySelector\('\.submit-panel'\)\.hidden=false/);
});
test('GĐ1: attempt.theme và attempt.reading được gán từ lúc tạo HTML',()=>{
 const out=html.renderHtml(clone(fixture));
 // attempt.reading được gán trong script inline cuối HTML
 assert.match(out,/attempt\.reading=/);
 // Mẫu reading có bài đọc nên phải có HÀNH TRÌNH ĐỌC HIỂU
 assert.match(out,/HÀNH TRÌNH ĐỌC HIỂU/);
});
test('GĐ1: scroll lên câu 1 khi bấm Làm lại',()=>{
 const out=html.renderHtml(clone(fixture));
 assert.match(out,/data-question-index="0"\].*scrollIntoView/);
});
