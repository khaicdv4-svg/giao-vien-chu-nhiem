'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('../review-html.cjs'),fixture=require('./fixtures/review-grid4.json');
const domain=require('../app/review-domain.js');
test('all three essay presentation modes survive normalization and export',()=>{
  const practice=html.createPractice(fixture);
  assert.deepEqual(practice.questions.filter(q=>q.type==='OPEN').map(q=>q.answerLayout),['grid-calculation','grid-calculation','grid-calculation','grid-calculation','grid-text','plain']);
  const output=html.renderHtml(fixture);
  assert.equal((output.match(/class="grid-notebook"/g)||[]).length,4);
  assert.match(output,/notebook-text/);
  assert.match(output,/name="q5" rows="6"/);
  assert.doesNotMatch(output,/<script[^>]+src=|<link[^>]+href=/i);
});
test('structured cells and real ruler lines remain an ungraded essay answer',()=>{
  const practice=html.createPractice(fixture);
  const answer={kind:'grid-v1',mode:'calculation',cols:7,rows:5,cells:{'0:2':'1','0:3':'2','0:4':'5','2:4':'0'},lines:[{id:'line-1',orientation:'h',boundary:2,start:2,end:4}],history:[]};
  const submitted=domain.submitAttempt(practice,{add3:answer,choice:1},{submissionId:'grid'});
  assert.equal(submitted.score,null);
  assert.equal(submitted.results[0].status,'pending-manual');
  assert.deepEqual(submitted.answers.add3,answer);
  assert.equal(submitted.results.at(-1).points,1);
  assert.throws(()=>domain.submitAttempt(submitted,{add3:{...answer,lines:[]}},{submissionId:'grid'}),/Bài đã nộp/);
});
test('unknown presentation mode is rejected instead of silently substituted',()=>{
  const input=structuredClone(fixture);input.questions[0].metadata.answerLayout='sketch';
  assert.throws(()=>html.renderHtml(input),/Câu 1.*khung tự luận/);
});
