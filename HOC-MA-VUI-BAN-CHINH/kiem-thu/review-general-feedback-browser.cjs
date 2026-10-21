'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs'),sample=require('./fixtures/review-math4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),rows=[];
const record=(id,method,evidence)=>{rows.push({id,status:'PASS',method,evidence});console.log(id+' PASS '+method);};
async function submit(page,keys){
  for(const [i,key] of keys.entries())if(key!=null)await page.locator(`input[name=q${i}][value="${key}"]`).check();
  page.once('dialog',dialog=>dialog.accept());await page.locator('#submit').click();
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const file=path.join(output,'toan-4-nhan-xet-va-giong-doc.html');fs.writeFileSync(file,html.renderHtml(sample));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  try{
    const context=await browser.newContext({offline:true,viewport:{width:390,height:900}});
    // Isolated UI/lifecycle simulation only: never evidence of audible speech.
    await context.addInitScript(()=>{
      class Utterance{constructor(text){this.text=text;}}
      class Synth extends EventTarget{
        constructor(){super();this.voices=[{name:'Test local Vietnamese',lang:'vi-VN',localService:true,voiceURI:'test-vi'}];this.spoken=[];this.cancelled=0;this.active=null;this.maxActive=0;}
        getVoices(){return this.voices;}
        speak(utterance){if(this.active)throw Error('overlapping speech');this.active=utterance;this.maxActive=1;this.spoken.push(utterance);}
        cancel(){const old=this.active;this.active=null;this.cancelled++;if(old&&old.onerror)old.onerror({error:'canceled'});}
        setVoices(voices){this.voices=voices;this.dispatchEvent(new Event('voiceschanged'));}
        finish(){const old=this.active;this.active=null;old.onend();}
        fail(){const old=this.active;this.active=null;old.onerror({error:'synthesis-failed'});}
      }
      const synth=new Synth();Object.defineProperty(window,'speechSynthesis',{value:synth});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance});window.__testSpeech=synth;
    });
    const page=await context.newPage(),network=[],errors=[];
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(file).href);await submit(page,[1,0,2,3,1]);
    assert.match(await page.locator('#teacher-comment').textContent(),/đúng cả 5 câu.*10 trên 10 điểm/);
    assert.equal(await page.evaluate(()=>__testSpeech.spoken.length),0);
    await page.locator('.teacher-feedback').scrollIntoViewIfNeeded();
    record('A','real grading + browser text','10/10, no automatic speech');
    await page.locator('#speech-listen').click();
    assert.deepEqual(await page.evaluate(()=>{const u=__testSpeech.active;return {lang:u.lang,rate:u.rate,volume:u.volume,local:u.voice.localService};}),{lang:'vi-VN',rate:.95,volume:1,local:true});
    assert.equal(await page.locator('#speech-stop').isVisible(),true);
    record('F','SIMULATED TTS','Button creates Vietnamese local utterance');
    await page.locator('#speech-stop').click();assert.equal(await page.evaluate(()=>__testSpeech.active),null);
    assert.match(await page.locator('#speech-status').textContent(),/Đã dừng/);
    record('G','SIMULATED TTS','Stop calls cancel and restores idle UI');
    await page.locator('#speech-listen').click();const first=await page.evaluate(()=>__testSpeech.active.text);
    await page.locator('#speech-listen').click();assert.equal(await page.evaluate(()=>__testSpeech.active.text),first);
    assert.equal(await page.evaluate(()=>__testSpeech.spoken.length),3);
    assert.equal(await page.evaluate(()=>__testSpeech.maxActive),1);
    await page.evaluate(()=>__testSpeech.spoken[1].onend());assert.equal(await page.locator('#speech-stop').isVisible(),true);
    await page.evaluate(()=>__testSpeech.finish());assert.match(await page.locator('#speech-status').textContent(),/Đã đọc xong/);
    await page.locator('#speech-rate').selectOption('0.8');await page.locator('#speech-listen').click();
    assert.equal(await page.evaluate(()=>__testSpeech.active.rate),.8);
    await page.evaluate(()=>__testSpeech.fail());assert.match(await page.locator('#speech-status').textContent(),/Không phát được/);
    record('H','SIMULATED TTS','Replay cancels prior utterance; stale callbacks ignored; speed/end/error handled');
    await page.evaluate(()=>__testSpeech.setVoices([{lang:'en-US',localService:true},{lang:'vi-VN',localService:false}]));
    assert.equal(await page.locator('#speech-listen').isDisabled(),true);
    assert.match(await page.locator('#speech-status').textContent(),/Chưa có giọng tiếng Việt cục bộ/);
    assert.ok(await page.locator('#teacher-comment').textContent());
    await page.evaluate(()=>__testSpeech.setVoices([{name:'New local VI',lang:'vi',localService:true}]));
    assert.equal(await page.locator('#speech-listen').isEnabled(),true);
    await page.locator('#speech-listen').click();await page.evaluate(()=>dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(()=>__testSpeech.active),null);
    record('I','SIMULATED TTS','No local Vietnamese disables speech, retains text; voiceschanged and leaving page handled');
    for(const [id,keys,pattern,score] of [
      ['B',[1,0,0,3,1],/đúng phần lớn.*8 trên 10 điểm/,8],
      ['C',[0,1,0,0,0],/đúng 0 trong 5.*0 trên 10 điểm/,0],
      ['D',[1,1,null,null,null],/3 câu chưa trả lời/,2]
    ]){
      await page.evaluate(()=>localStorage.clear());await page.reload();await submit(page,keys);const comment=await page.locator('#teacher-comment').textContent();
      assert.match(comment,pattern);assert.equal(await page.locator('#result').textContent(),`Kết quả: ${score} / 10 điểm`);
      assert.doesNotMatch(comment,/lười|kém|mất tập trung|quên công thức|bạn khác/);
      if(id==='B'){
        await page.setViewportSize({width:1366,height:900});await page.locator('.teacher-feedback').scrollIntoViewIfNeeded();
        
      }
      record(id,'real grading + browser text','Comment matches actual score/answers');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    record('J/K/L','offline browser','HTML/text/scoring work offline; no app HTTP requests; simulated TTS uses local voice only');
    const mixed=require('./fixtures/review-mixed4.json');const mixedFile=path.join(output,'tu-luan-cho-cham.html');fs.writeFileSync(mixedFile,html.renderHtml(mixed));
    await page.goto(pathToFileURL(mixedFile).href);page.once('dialog',d=>d.accept());await page.locator('#submit').click();
    assert.match(await page.locator('#teacher-comment').textContent(),/chờ thầy cô chấm.*chưa có kết quả toàn bài/);
    assert.match(await page.locator('#result').textContent(),/Chưa có điểm tổng chính thức/);record('05D-C','real browser','Pending manual work never described as fully graded');
    for(const [index,policy] of [{scoreVisibility:'teacher',answerVisibility:'immediate'},{scoreVisibility:'immediate',answerVisibility:'never'},{scoreVisibility:'never',answerVisibility:'teacher'}].entries()){
      const hidden=structuredClone(sample);hidden.id+='-hidden-'+index;hidden.metadata={...hidden.metadata,...policy};const hiddenFile=path.join(output,'cho-cong-bo-'+index+'.html');fs.writeFileSync(hiddenFile,html.renderHtml(hidden));
      await page.goto(pathToFileURL(hiddenFile).href);await submit(page,[1,0,2,3,1]);const comment=await page.locator('#teacher-comment').textContent();assert.match(comment,/Cảm ơn em/);assert.doesNotMatch(comment,/điểm|đúng|sai|câu|10|5/);assert.equal(await page.locator('.teacher-feedback').isVisible(),true);
      await page.locator('#speech-listen').click();assert.equal(await page.evaluate(()=>__testSpeech.active.text),comment);await page.locator('#speech-stop').click();
    }
    record('05D-D','real browser + SIMULATED TTS','Hidden results give neutral text and exactly the same neutral speech');
    await context.close();
    // Native API inventory: no mocks. Hardware audio is explicitly not asserted.
    const native=await browser.newContext({offline:true,viewport:{width:390,height:900}});const nativePage=await native.newPage();
    await nativePage.goto(pathToFileURL(file).href);await submit(nativePage,[1,0,2,3,1]);
    const inventory=await nativePage.evaluate(async()=>{
      const synth=window.speechSynthesis;if(!synth)return {supported:false,voices:[]};
      if(!synth.getVoices().length)await new Promise(resolve=>{synth.addEventListener('voiceschanged',resolve,{once:true});setTimeout(resolve,1800);});
      return {supported:typeof SpeechSynthesisUtterance==='function',voices:synth.getVoices().map(v=>({name:v.name,lang:v.lang,localService:v.localService}))};
    });
    const hasVietnamese=inventory.voices.some(v=>/^vi(?:[-_]|$)/i.test(v.lang)&&v.localService===true);
    if(!hasVietnamese)assert.equal(await nativePage.locator('#speech-listen').isDisabled(),true);
    await nativePage.locator('.teacher-feedback').scrollIntoViewIfNeeded();
    fs.writeFileSync(path.join(output,'native-voices.json'),JSON.stringify({...inventory,hasLocalVietnamese:hasVietnamese,audibleVietnameseTest:'BLOCKED: no hardware listening verified; do not infer audio success from mocks',uiStatus:await nativePage.locator('#speech-status').textContent()},null,2));
    console.log('NATIVE VOICES',JSON.stringify(inventory));await native.close();
    const unsupported=await browser.newContext({offline:true});
    await unsupported.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{value:undefined}));
    const unsupportedPage=await unsupported.newPage();await unsupportedPage.goto(pathToFileURL(file).href);await submit(unsupportedPage,[1,0,2,3,1]);
    assert.equal(await unsupportedPage.locator('#speech-listen').isDisabled(),true);
    assert.match(await unsupportedPage.locator('#speech-status').textContent(),/chưa hỗ trợ/);
    assert.match(await unsupportedPage.locator('#teacher-comment').textContent(),/10 trên 10 điểm/);
    record('UNSUPPORTED','SIMULATED unavailable API','Text/scoring retained with speech API absent');await unsupported.close();
  }finally{await browser.close();fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(rows,null,2));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
