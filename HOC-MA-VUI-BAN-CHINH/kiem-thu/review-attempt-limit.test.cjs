'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('../review-html.cjs'),fixture=require('./fixtures/review-math4.json');
test('only explicit practice limits are exported; legacy and assessment stay unchanged',()=>{
  const make=value=>({...structuredClone(fixture),metadata:{...fixture.metadata,purpose:'Bài tập thường xuyên',attemptLimit:value}});
  for(const value of [1,2,3,'unlimited'])assert.equal(html.createPractice(make(value)).attemptLimit,value);
  assert.equal(Object.hasOwn(html.createPractice(fixture),'attemptLimit'),false);
  const assessment=make(2);assessment.metadata.purpose='Đề kiểm tra';
  assert.equal(Object.hasOwn(html.createPractice(assessment),'attemptLimit'),false);
  assert.throws(()=>html.createPractice(make(0)),/Số lần/);
});
