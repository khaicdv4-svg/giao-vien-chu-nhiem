'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('../review-html.cjs');
const sample=require('./fixtures/review-math4.json');
test('A: 10/10 comment reports actual correct count and score',()=>{
  const result=html.grade(html.createPractice(sample),{q1:1,q2:0,q3:2,q4:3,q5:1},{submissionId:'a'});
  assert.equal(typeof html.createFeedback,'function');
  assert.match(html.createFeedback(result),/đúng cả 5 câu/);
  assert.match(html.createFeedback(result),/10 trên 10 điểm/);
});
const answers={q1:1,q2:0,q3:2,q4:3,q5:1};
const grade=(given,input=sample)=>html.grade(html.createPractice(input),given,{submissionId:'feedback'});
test('B: one wrong answer names it and preserves 8/10',()=>{
  const graded=grade({...answers,q3:0}),comment=html.createFeedback(graded);
  assert.equal(graded.score,8);assert.match(comment,/đúng phần lớn/);assert.match(comment,/câu 3/);assert.match(comment,/8 trên 10 điểm/);
});
test('C: many wrong answers encourage without making diagnoses',()=>{
  const comment=html.createFeedback(grade({q1:0,q2:1,q3:0,q4:0,q5:0}));
  assert.match(comment,/đúng 0 trong 5/);assert.match(comment,/nhờ thầy cô hỗ trợ/);
  assert.doesNotMatch(comment,/yếu|kém|lười|cẩu thả|mất tập trung|bạn khác/);
});
test('D/E: blanks are distinct; missing metadata does not invent a misconception',()=>{
  const result=structuredClone(grade({q1:1,q2:1}));delete result.metadata.topic;
  result.questions.forEach(question=>delete question.topic);
  const comment=html.createFeedback(result);
  assert.match(comment,/câu 2/);assert.match(comment,/3 câu chưa trả lời \(câu 3, 4, 5\)/);
  assert.doesNotMatch(comment,/chủ đề|phép nhân|quên|nhầm|không hiểu|lời giải/);
});
test('confirmed knowledge only; common feedback does not read per-question solutions',()=>{
  const input=structuredClone(sample);input.questions[1].explanation='PRIVATE_SOLUTION';input.questions[1].metadata={topic:'Phép nhân',explanationConfirmed:true};
  assert.doesNotMatch(html.createFeedback(grade({...answers,q2:1},input)),/Phép nhân|PRIVATE_SOLUTION/);
  input.questions[1].metadata.topicConfirmed=true;
  const result=grade({...answers,q2:1},input),before=JSON.stringify(result),comment=html.createFeedback(result);
  assert.match(comment,/Phép nhân/);assert.doesNotMatch(comment,/PRIVATE_SOLUTION/);assert.equal(JSON.stringify(result),before);
});
test('pending manual work has no assumed total, hidden results get neutral text',()=>{
  const input=structuredClone(sample);input.questions.push({id:'essay',type:'OPEN',text:'Viết bài',points:2});
  const result=grade(answers,input);assert.match(html.createFeedback(result),/chờ thầy cô chấm.*chưa có kết quả toàn bài/);
  for(const visibility of [{score:false,answers:true},{score:true,answers:false},{score:false,answers:false}]){
    const comment=html.createFeedback(result,visibility);assert.doesNotMatch(comment,/điểm|đúng|sai|câu|chờ.*chấm/);assert.match(comment,/Cảm ơn em/);
  }
});

test('Vietnamese local voices only; vi-VN preferred, remote/English/unknown rejected',()=>{
  const local={name:'Local Vietnamese',lang:'vi-VN',localService:true};
  assert.equal(html.chooseLocalVietnameseVoice([{lang:'en-US',localService:true},{lang:'vi-VN',localService:false}]),null);
  assert.equal(html.chooseLocalVietnameseVoice([{lang:'vi-VN'}]),null);
  assert.strictEqual(html.chooseLocalVietnameseVoice([{lang:'vi',localService:true},local]),local);
  assert.ok(html.chooseLocalVietnameseVoice([{lang:'vi_VN',localService:true}]));
});
