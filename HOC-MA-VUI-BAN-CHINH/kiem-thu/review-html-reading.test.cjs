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
