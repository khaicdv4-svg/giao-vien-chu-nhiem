'use strict';
// Lệnh 08A – nộp bài trực tuyến: cấu hình đường dẫn và mã nhận bài Google Apps Script.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=require('../review-html.cjs'),fixture=require('./fixtures/review-combined4.json');
const URL_OK='https://script.google.com/macros/s/AKfycbx1234567890abcdefghijKLMN/exec';
const withUrl=u=>{const d=structuredClone(fixture);d.metadata.submitUrl=u;return d;};
test('chỉ nhận đường dẫn Google Apps Script; CSP chỉ mở cho Google khi có cấu hình',()=>{
  assert.equal(html.createPractice(withUrl(URL_OK)).submitUrl,URL_OK);
  assert.equal(html.createPractice(withUrl('https://script.google.com/a/macros/truong.edu.vn/s/AKfycbx1234567890abcdefghij/exec')).submitUrl.includes('/a/macros/'),true);
  for(const bad of ['http://script.google.com/macros/s/AKfycbx1234567890abcdefghij/exec','https://evil.example/macros/s/AKfycbx1234567890abcdefghij/exec','https://script.google.com.evil.io/macros/s/AKfycbx1234567890abcdefghij/exec','javascript:alert(1)'])
    assert.throws(()=>html.createPractice(withUrl(bad)),/Google Apps Script/);
  const on=html.renderHtml(withUrl(URL_OK)),off=html.renderHtml(fixture);
  assert.match(on,/connect-src https:\/\/script\.google\.com https:\/\/script\.googleusercontent\.com;/);assert.match(on,/id="student-name"/);
  assert.match(off,/connect-src 'none'/);assert.doesNotMatch(off,/id="student-name"/);assert.equal(Object.hasOwn(html.createPractice(fixture),'submitUrl'),false);
});
function loadScript(){
  const rows=[];const sheet={getLastRow:()=>rows.length,getRange:(r,c,n)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>[x[c-1]])}),appendRow:x=>rows.push(x),setFrozenRows(){}};
  const ctx={rows,LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>rows.length?sheet:null,insertSheet:()=>sheet})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../google-apps-script/NhanBai.gs'),'utf8'),ctx);return ctx;
}
const post=(ctx,body)=>ctx.doPost({postData:{contents:JSON.stringify(body)}});
test('Apps Script: ghi một dòng, chống trùng khi gửi lại, chặn công thức, tính điểm tự chấm/chờ chấm',()=>{
  const ctx=loadScript();
  const body={kind:'hmv-online-submission',studentName:'=Nguyễn Văn An',submissionId:'s1',attemptId:'a1',documentId:'combined-math4',documentVersion:1,title:'Toán 4',
    results:[{status:'graded',points:2/3,maxPoints:1},{status:'graded',points:1,maxPoints:1},{status:'pending-manual',points:null,maxPoints:2}]};
  assert.deepEqual(post(ctx,body),{ok:true});
  assert.equal(ctx.rows.length,2);assert.equal(ctx.rows[0][1],'Họ và tên');
  const row=ctx.rows[1];assert.equal(row[1],"'=Nguyễn Văn An");assert.equal(row[7],1.67);assert.equal(row[8],2);assert.equal(row[9],1);assert.equal(row[10],2);
  assert.equal(JSON.parse(row[11]).submissionId,'s1');
  assert.deepEqual(post(ctx,body),{ok:true,duplicate:true});assert.equal(ctx.rows.length,2);
  assert.deepEqual(post(ctx,{...body,submissionId:'s2',studentName:'  '}),{ok:false,error:'name'});
  assert.deepEqual(post(ctx,{kind:'other'}),{ok:false,error:'invalid'});
  assert.deepEqual(ctx.doPost({postData:{contents:'not json'}}),{ok:false,error:'server'});
  assert.equal(ctx.rows.length,2);
});
