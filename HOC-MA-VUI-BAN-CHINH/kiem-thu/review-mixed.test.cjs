'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const html=require('../review-html.cjs');
const mixed=require('./fixtures/review-mixed4.json');
const old=require('./fixtures/review-math4.json');

test('old five-choice exercise remains 10/10',()=>{
  const a=html.grade(html.createPractice(old),{q1:1,q2:0,q3:2,q4:3,q5:1},{submissionId:'old'});
  assert.equal(a.score,10);assert.equal(a.pendingManual,0);
});
test('mixed exercise keeps separate graded and pending totals',()=>{
  const before=JSON.stringify(mixed),practice=html.createPractice(mixed);
  const answers={choice:1,short:'  500  ',essay:'125 + 375\n= 500\nVì 125 và 375 ghép thành 500.'};
  const a=html.grade(practice,answers,{submissionId:'mixed'});
  assert.equal(a.score,null);assert.equal(a.maxScore,10);assert.equal(a.pendingManual,1);
  assert.deepEqual(a.results.map(r=>[r.status,r.points,r.maxPoints]),[['graded',2,2],['graded',2,2],['pending-manual',null,6]]);
  assert.equal(a.answers.essay,answers.essay);
  assert.throws(()=>html.grade(a,{...answers,essay:'changed'},{submissionId:'mixed'}),/Bài đã nộp/);
  assert.equal(html.grade(a,answers,{submissionId:'mixed'}),a);
  assert.equal(JSON.stringify(mixed),before);
});
test('short exact matches only explicit equivalents and safe whitespace/Unicode',()=>{
  const input=html.createPractice(mixed);
  const grade=(value,key)=>html.grade(input,{short:value},{submissionId:key}).results[1];
  for(const value of ['500','  500  ','500 đơn vị'])assert.equal(grade(value,value).points,2);
  for(const value of ['5000','500 m','500đơn vị','500,0','0500',''])assert.equal(grade(value,'wrong-'+value).points,0);
});
test('uncertain short answer waits for manual grading, then official total exists',()=>{
  const input=structuredClone(mixed);delete input.questions[1].metadata.shortScoring;
  const a=html.grade(html.createPractice(input),{choice:1,short:'500',essay:'Bài làm'},{submissionId:'pending'});
  assert.equal(a.pendingManual,2);assert.equal(a.score,null);
  const b=require('../app/review-domain.js').gradeManual(a,'short',2);
  assert.equal(b.pendingManual,1);assert.equal(b.score,null);
  const c=require('../app/review-domain.js').gradeManual(b,'essay',5);
  assert.equal(c.pendingManual,0);assert.equal(c.score,9);
  assert.equal(require('../app/review-domain.js').gradeManual(c,'essay',6).score,10);
  assert.throws(()=>require('../app/review-domain.js').gradeManual(c,'short',1),/Không phải câu giáo viên chấm/);
});
test('invalid short equivalence is rejected instead of silently dropped',()=>{
  const input=structuredClone(mixed);input.questions[1].metadata.acceptedAnswers=['500',42];
  assert.throws(()=>html.createPractice(input),/Câu 2.*cấu hình/);
});
test('standalone HTML has mixed fields and does not contain teacher essay rubric',()=>{
  const output=html.renderHtml(mixed);
  assert.match(output,/name="q0" type="radio"|type="radio" name="q0"/);
  assert.match(output,/name="q1" type="text"/);
  assert.match(output,/name="q2" rows="6"/);
  assert.match(output,/Tải bản sao bài làm/);
  assert.doesNotMatch(output,/Đúng phép cộng: 2 điểm/);
  assert.doesNotMatch(output,/<script[^>]+src=|<link[^>]+href=/i);
});
