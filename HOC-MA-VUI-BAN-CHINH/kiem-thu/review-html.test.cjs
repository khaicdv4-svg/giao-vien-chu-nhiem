'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const html = require('../review-html.cjs');
const raw = {id:'sample',title:'Toán lớp 4',metadata:{grade:4,subject:'Toán',topic:'Ôn tập'},questions:[{id:'q1',type:'SINGLE',text:'2 + 2 = ?',options:['3','4'],correctAnswers:[1],points:2}]};
const sample=require('./fixtures/review-math4.json');
test('unsupported question names its position instead of dropping content',()=>{
  const input=structuredClone(sample);input.questions[2].type='UNSUPPORTED';
  assert.throws(()=>html.renderHtml(input),/Câu 3.*UNSUPPORTED/);
});
test('Node and browser entry use exactly the same exporter; filename and metadata are safe',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync(require.resolve('../app/review-domain.js'),'utf8');
  const context=vm.createContext({window:{},structuredClone});
  vm.runInContext(source,context);
  vm.runInContext(fs.readFileSync(require.resolve('../app/review-html.js'),'utf8'),context);
  assert.equal(context.window.HmvReviewHtml.renderHtml(sample,source),html.renderHtml(sample));
  assert.doesNotMatch(html.filename('../CON: câu hỏi?*. '),/[<>:"/\\|?*\x00-\x1f]/);
  assert.ok(html.filename('Toán lớp 4').endsWith('.html'));
  const input=structuredClone(sample);
  input.metadata.unrelatedCredential='DO-NOT-EXPORT-THIS-FIELD';
  input.questions[0].source={token:'DO-NOT-EXPORT-THIS-FIELD'};
  assert.ok(!html.renderHtml(input).includes('DO-NOT-EXPORT-THIS-FIELD'));
});
test('exports a standalone UTF-8 practice document', () => {
  const output=html.renderHtml(raw);
  assert.match(output, /<!doctype html>/i);
  assert.match(output, /charset="utf-8"/);
  assert.match(output, /LUYỆN TẬP/);
  assert.doesNotMatch(output, /<script[^>]+src=|<link[^>]+href=/i);
});
test('correct, incorrect and missing answers use existing domain grading',()=>{
  for(const [answer,expected] of [[1,2],[0,0],[undefined,0]]){
    const result=html.grade(html.createPractice(raw),answer===undefined?{}:{q1:answer},{submissionId:'one'});
    assert.equal(result.score,expected);
    assert.equal(result.maxScore,2);
  }
});
test('five-question total and immutable repeated submission',()=>{
  const before=JSON.stringify(sample);
  const attempt=html.createPractice(sample);
  const answers={q1:1,q2:0,q3:2,q4:3,q5:1};
  const graded=html.grade(attempt,answers,{submissionId:'once'});
  assert.equal(graded.score,10);
  assert.equal(graded.maxScore,10);
  assert.strictEqual(html.grade(graded,answers,{submissionId:'once'}),graded);
  assert.throws(()=>html.grade(graded,{q1:0},{submissionId:'again'}),/Bài đã nộp/);
  assert.equal(attempt.status,'in-progress');
  assert.equal(JSON.stringify(sample),before);
  assert.equal(html.grade(html.createPractice(sample),{q1:1,q2:1,q4:3},{submissionId:'mixed'}).score,4);
});
test('untrusted markup cannot terminate inline script or become DOM markup',()=>{
  const evil='</script><img src=x onerror="window.pwned=1"><script>window.pwned=1</script> & tiếng Việt';
  const input=structuredClone(raw);
  input.title=evil;input.questions[0].text=evil;input.questions[0].options[0]=evil;input.questions[0].id=evil;
  const output=html.renderHtml(input);
  assert.equal((output.match(/<script>/g)||[]).length,2);
  assert.equal((output.match(/<\/script>/g)||[]).length,2);
  assert.ok(!output.includes('<img src=x'));
  assert.ok(output.includes('&lt;/script&gt;'));
  assert.ok(output.includes('\\u003c/script\\u003e'));
});
test('unsupported types, linked blocks and invalid answer keys fail explicitly',()=>{
  for(const change of [q=>q.type='UNSUPPORTED',q=>q.correctAnswers=[7],q=>q.points=-1,q=>q.blockIds=['paragraph']]){
    const input=structuredClone(raw);change(input.questions[0]);
    assert.throws(()=>html.renderHtml(input));
  }
});
