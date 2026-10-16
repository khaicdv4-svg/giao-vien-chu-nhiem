const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.HMV_PLAYWRIGHT||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'../app');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());const p=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(root)||!fs.existsSync(p))return route.fulfill({status:404,body:''});const type={'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg'}[path.extname(p)];return route.fulfill({path:p,contentType:type||'application/octet-stream'});});
  const page=await ctx.newPage();
  // Model the mobile policy that rejects fresh media elements at result time.
  await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Gesture required','NotAllowedError'));};});
  await page.goto('https://hmv.test/#trai-nghiem/bong-bay');
  await page.locator('[data-entry-play]').click();
  await page.waitForFunction(()=>window.hmvBalloon&&classroomGame.started);
  await page.addStyleTag({content:'.bb-balloon{animation:none!important;transition:none!important}'});
  assert.equal(await page.evaluate(()=>!!window.hmvEffectAudio),true,'shared unlocked effect engine exists');
  const right=await page.evaluate(()=>hmvBalloon.state().match.question.correct);
  await page.locator('[data-bb-pick="'+right+'"]').click();
  await page.waitForFunction(()=>hmvEffectAudio.state('answer').playing);
  assert.equal(await page.evaluate(()=>hmvDungSai.state().last.fallback),false,'right sound uses decoded MP3');
  await page.locator('[data-bb="next"]').click();
  const wrong=await page.evaluate(()=>(hmvBalloon.state().match.question.correct+1)%hmvBalloon.state().match.question.answers.length);
  await page.locator('[data-bb-pick="'+wrong+'"]').click();
  await page.waitForFunction(()=>hmvEffectAudio.state('answer').playing);
  assert.equal(await page.evaluate(()=>hmvEffectAudio.state('answer').source),'assets/audio/tra-loi-sai.mp3');
  await page.evaluate(()=>hmvDungSai.stop());
  assert.equal(await page.evaluate(()=>hmvEffectAudio.state('answer').playing),false,'answer sound stops');
  await page.goto('https://hmv.test/#trai-nghiem/vong-quay');
  await page.locator('#spinButton').click();
  await page.waitForTimeout(7100);
  await page.waitForFunction(()=>hmvEffectAudio.state('wheel').playing,{},{timeout:12000});
  const wheel=await page.evaluate(()=>hmvEffectAudio.state('wheel'));
  assert.ok(wheel.playing,'wheel result sound plays after delayed stop');
  await page.evaluate(()=>audioStopAll());
  assert.equal(await page.evaluate(()=>hmvEffectAudio.state('wheel').playing),false,'wheel exit stops audio');
  await page.evaluate(()=>{audioMasterEnabled=false;pickerWinSound();});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>hmvEffectAudio.state('wheel').playing),false,'master mute respected');
  await page.evaluate(async()=>{audioMasterEnabled=true;const blob=await fetch('assets/audio/win.mp3').then(r=>r.blob());audioCustom.win={blob,name:'custom-win.mp3'};audioEffect('win');});
  await page.waitForFunction(()=>hmvEffectAudio.state('wheel').playing);
  assert.equal(await page.evaluate(()=>hmvEffectAudio.state('wheel').source),'custom','uploaded wheel sound preserved');
  await page.evaluate(()=>audioStopAll());
  console.log('PASS: QR balloon right/wrong, delayed wheel result, cancellation with blocked HTML audio');
  await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
