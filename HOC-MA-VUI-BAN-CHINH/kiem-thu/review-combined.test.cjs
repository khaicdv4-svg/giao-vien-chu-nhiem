'use strict';
// Lệnh 07 – kiểm thử đề tổng hợp: đủ 8 dạng câu trong một đề Toán lớp 4.
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('../review-html.cjs'),D=require('../app/review-domain.js');
const fixture=require('./fixtures/review-combined4.json');
const full={single:1,tf:[true,false,true],multi:[0,2],fill:{1:'120',2:'300',3:'5 000'},match:[0,1,2],short:'100000',essay:'1250 - 475 = 775 (kg)',grid:{cells:{}}};
const pts=a=>Object.fromEntries(a.results.map(r=>[r.questionId,r.points]));

test('đề tổng hợp hợp lệ, đủ 8 dạng, tổng 10 điểm, giữ cấu hình lượt/quyền',()=>{
  const p=html.createPractice(fixture);
  assert.deepEqual(D.validateDocument(D.normalizeDocument(fixture)),[]);
  assert.deepEqual([...new Set(fixture.questions.map(q=>q.type+(q.metadata?.answerLayout==='grid-calculation'?'-grid':'')))].length,8);
  assert.equal(p.attemptLimit,2);assert.equal(p.scoreVisibility,'immediate');assert.equal(p.answerVisibility,'after-attempts');
});
test('làm đúng hết: tự chấm 6/6, chờ chấm 2 câu, chưa có điểm tổng giả; chấm tay xong = 10',()=>{
  const a=html.grade(html.createPractice(fixture),full,{submissionId:'full'});
  assert.equal(a.score,null);assert.equal(a.pendingManual,2);assert.equal(a.maxScore,10);
  assert.deepEqual(pts(a),{single:1,tf:1,multi:1,fill:1,match:1,short:1,essay:null,grid:null});
  const b=D.gradeManual(D.gradeManual(a,'essay',2),'grid',2);
  assert.equal(b.pendingManual,0);assert.equal(b.score,10);
});
test('điểm từng phần không làm tròn sớm; tổng chính thức cộng đúng',()=>{
  const ans={single:0,tf:[true,true,true],multi:[0],fill:{1:'120',2:'30',3:'5000'},match:[1,0,2],short:'100 000 ',essay:'x',grid:{cells:{}}};
  const a=html.grade(html.createPractice(fixture),ans,{submissionId:'part'});
  const p=pts(a);
  assert.equal(p.single,0);assert.equal(p.tf,2/3);assert.equal(p.multi,0);assert.equal(p.fill,2/3);assert.equal(p.match,1/3);assert.equal(p.short,1);
  assert.equal(a.score,null);
  const b=D.gradeManual(D.gradeManual(a,'essay',1.5),'grid',0.5);
  assert.equal(b.score,2/3+2/3+1/3+1+1.5+0.5);
  assert.ok(Math.abs(b.score-4.6666666667)<1e-9);
});
test('bỏ trống toàn bộ: tự chấm 0, không lỗi; chọn thừa nhiều đáp án = 0',()=>{
  const a=html.grade(html.createPractice(fixture),{},{submissionId:'blank'});
  assert.deepEqual(pts(a),{single:0,tf:0,multi:0,fill:0,match:0,short:0,essay:null,grid:null});
  const b=html.grade(html.createPractice(fixture),{multi:[0,1,2]},{submissionId:'extra'});
  assert.equal(pts(b).multi,0);
});
test('HTML xuất ra: đủ ô nhập 8 dạng, không tải tài nguyên ngoài, không lộ hướng dẫn chấm tự luận',()=>{
  const out=html.renderHtml(fixture);
  assert.match(out,/name="q0"[^>]*type="radio"|type="radio"[^>]*name="q0"/);
  assert.match(out,/name="q1s0"/);assert.match(out,/type="checkbox"/);assert.match(out,/name="q3b1"/);
  assert.match(out,/data-matching="4"/);assert.match(out,/name="q5"/);assert.match(out,/data-grid-question="7"/);
  assert.doesNotMatch(out,/<script[^>]+src=|<link[^>]+href=/i);
  assert.doesNotMatch(out,/Lời giải đúng: 1 điểm/);assert.doesNotMatch(out,/Đặt thẳng hàng: 1 điểm/);
});
