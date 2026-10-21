'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const h=require('../review-html.cjs'),sample=require('./fixtures/review-math4.json');
function rig(catalog=[],voices=[]){
 const elements=Object.fromEntries(['speech-listen','speech-stop','speech-status','teacher-comment','speech-rate'].map(id=>[id,Object.assign(new EventTarget(),{textContent:'',value:'.95',hidden:false,disabled:false})]));elements['teacher-comment'].textContent='Nhận xét bằng chữ.';
 const players=[],timers=new Map();let serial=0,active=0,maximum=0,cancelled=0;const spoken=[];
 class Audio{constructor(){players.push(this);this.active=false;}play(){if(!this.active){this.active=true;active++;maximum=Math.max(active,maximum);}return Promise.resolve();}pause(){if(this.active){this.active=false;active--;}}removeAttribute(){this.src='';}load(){}}
 const synth=Object.assign(new EventTarget(),{getVoices:()=>voices,speak:u=>spoken.push(u),cancel:()=>{cancelled++;}});
 const win=Object.assign(new EventTarget(),{Audio,speechSynthesis:synth,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}});
 const ctx={window:win,document:{getElementById:id=>elements[id]},chooseLocalVietnameseVoice:h.chooseLocalVietnameseVoice,setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext('('+h.setupSpeech.toString()+')',ctx)(()=> 'neutral',catalog);
 const click=id=>elements[id].dispatchEvent(new Event('click'));
 return {elements,players,timers,spoken,win,click,maximum:()=>maximum,cancelled:()=>cancelled};
}
// These symbolic source strings exist only in the injected simulation, never in generated HTML.
const mockCatalog=[{id:'neutral',teacherConfirmed:true,onlineUrl:'SIMULATED_ONLINE_SOURCE',offlineSrc:'SIMULATED_OFFLINE_SOURCE'}];
test('catalog has eight stable unapproved groups with no invented sources',()=>{assert.equal(h.feedbackAudioGroups.length,8);assert.ok(h.feedbackAudioGroups.every(g=>!g.teacherConfirmed&&!g.onlineUrl&&!g.offlineSrc));assert.equal(h.normalizeFeedbackAudio([{...h.feedbackAudioGroups[0],onlineUrl:'https://example.invalid/mock'}])[0].onlineUrl,null);});
test('A/B/D SIMULATION: lazy online, error/timeout fallback, replay/stop/unload cancel stale sources',()=>{
 const r=rig(mockCatalog);assert.equal(r.players.length,0);r.click('speech-listen');assert.equal(r.players[0].src,'SIMULATED_ONLINE_SOURCE');const stale=r.players[0].onerror;r.players[0].onerror();assert.equal(r.players[1].src,'SIMULATED_OFFLINE_SOURCE');assert.equal(r.maximum(),1);
 r.click('speech-stop');assert.equal(r.timers.size,0);stale();assert.equal(r.players.length,2);r.click('speech-listen');assert.equal(r.players[2].src,'SIMULATED_ONLINE_SOURCE');[...r.timers.values()][0]();assert.equal(r.players[3].src,'SIMULATED_OFFLINE_SOURCE');r.players[3].onplaying();assert.equal(r.timers.size,0);r.win.dispatchEvent(new Event('pagehide'));assert.equal(r.maximum(),1);assert.equal(r.players[3].active,false);
});
test('B/C SIMULATION: exhausted files try Vietnamese local voice; no suitable voice gives explicit text fallback',()=>{
 const voice={lang:'vi-VN',name:'Mock local VI',localService:true},r=rig(mockCatalog,[voice]);r.click('speech-listen');r.players[0].onerror();r.players[1].onerror();assert.equal(r.spoken.length,1);assert.equal(r.spoken[0].lang,'vi-VN');r.click('speech-listen');assert.equal(r.cancelled(),1);r.click('speech-stop');
 const none=rig([],[{lang:'en-US',localService:true}]);none.click('speech-listen');assert.equal(none.spoken.length,0);assert.match(none.elements['speech-status'].textContent,/Chưa có âm thanh/);assert.equal(none.elements['teacher-comment'].textContent,'Nhận xét bằng chữ.');
});
test('E/F: neutral wins over all result groups when hidden; pending and blank win over score; grading/text untouched',()=>{
 const result=h.grade(h.createPractice(sample),{q1:1,q2:0,q3:2,q4:3,q5:1},{submissionId:'audio'}),before=JSON.stringify(result),text=h.createFeedback(result);
 assert.equal(h.chooseFeedbackAudioGroup(result,{score:true,answers:true}),'excellent');assert.equal(h.chooseFeedbackAudioGroup(result,{score:false,answers:true}),'neutral');assert.equal(h.chooseFeedbackAudioGroup(result,{score:true,answers:false}),'neutral');
 const partial=structuredClone(result);partial.results[0].status='pending-manual';assert.equal(h.chooseFeedbackAudioGroup(partial,{score:true,answers:true}),'pending');delete partial.answers.q1;partial.results[0].status='graded';assert.equal(h.chooseFeedbackAudioGroup(partial,{score:true,answers:true}),'unanswered');assert.equal(JSON.stringify(result),before);assert.equal(h.createFeedback(result),text);
});
