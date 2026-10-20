// Kiểm thử bản 2.18: chọn bộ câu hỏi hai chiều (Kho → trò và Trò → Cài đặt/màn hình chính → chọn bộ) cho 10 trò.
// Bộ thử A/B được ghi vào IndexedDB của hồ sơ trình duyệt tạm. Chạy: node kiem-thu/t-hai-chieu.cjs
const assert=require('node:assert/strict');const path=require('path'),fs=require('fs');const {chromium}=require(process.env.HMV_PLAYWRIGHT||'playwright');
const APP=path.resolve(__dirname,'../app');
async function serve(ctx,app){await ctx.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='hmv.test')return route.fulfill({status:404,body:''});let p=path.join(app,decodeURIComponent(url.pathname));if(url.pathname==='/')p=path.join(app,'index.html');if(!p.startsWith(app)||!fs.existsSync(p)||fs.statSync(p).isDirectory())return route.fulfill({status:404,body:''});const ext=path.extname(p);await route.fulfill({path:p,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'})[ext]||'application/octet-stream'});});}
const SYS_A=['tug','gift','buzzer','race','millionaire'],MOD=['balloon','poll','raise-hand','magic-hand','head-tilt'];
function mk(tag,name){const q=[];for(let i=1;i<=10;i++)q.push({id:tag+'-a'+i,text:tag+' câu ABCD số '+i+' bằng mấy?',question:tag+' câu ABCD số '+i+' bằng mấy?',answers:['1','2','3','4'],options:['1','2','3','4'],correct:1,kind:'ABCD',grade:'Lớp 4',subject:'Toán',topic:'Thử'});
 for(let i=1;i<=10;i++)q.push({id:tag+'-t'+i,text:tag+' nhận định số '+i,question:tag+' nhận định số '+i,answers:['Đúng','Sai'],options:['Đúng','Sai'],correct:0,kind:'TRUEFALSE',grade:'Lớp 4',subject:'Toán',topic:'Thử'});
 return {id:'test-'+tag,name:name,setTitle:name,grade:'Lớp 4',subject:'Toán',topic:'Thử',questions:q};}
(async()=>{const b=await chromium.launch();const res={};
for(const t of SYS_A.concat(MOD)){
 const ctx=await b.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});await serve(ctx,APP);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto('https://hmv.test/');await p.waitForTimeout(2200);
 await p.evaluate(([A,B])=>(window.audioDB?Promise.resolve(window.audioDB):window.audioOpenDB()).then(db=>new Promise((res,rej)=>{const tx=db.transaction('questionSets','readwrite');tx.objectStore('questionSets').put(A);tx.objectStore('questionSets').put(B);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);})),[mk('AAA','Bộ thử A'),mk('BBB','Bộ thử B')]);
 await p.reload();await p.waitForTimeout(2200);
 if(!(await p.evaluate(()=>window.questionBankSets.some(s=>s.id==='test-BBB'))))throw Error('sets not loaded');
 const r={};
 // 1. Chiều xuôi: Kho -> Chơi ngay
 r.forward=await p.evaluate(t=>{const x=hmvC6PlayBankSet(t,'test-AAA');return x.ok},t);await p.waitForTimeout(1500);
 const txt=()=>p.evaluate(()=>{const m=document.getElementById('tiltSetupModal');return (m?m.innerText:'')+document.getElementById('games').innerText});
 const leave=()=>p.evaluate(()=>{document.querySelectorAll('#tiltSetupModal,#hmvPickOverlay').forEach(e=>e.remove());try{const bk=Array.from(document.querySelectorAll('#games button')).find(b=>/Về thư viện|←\s*Thư viện/.test(b.textContent));if(bk)bk.click();}catch(e){}openView('games');gameBack();});
 await leave();await p.waitForTimeout(400);
 // 2. Chiều ngược qua Cài đặt
 await p.evaluate(t=>gameSetup(t),t);await p.waitForTimeout(800);
 if(MOD.includes(t)){
  const btn=p.locator('#games button[data-hmv-pick-label], #tiltSetupModal button[data-hmv-pick-label], #games [data-hmv-mh-pick]').first();
  r.relabeled=(await btn.innerText()).trim();await btn.click();await p.waitForTimeout(300);
  r.pickerOpen=await p.locator('#hmvPickOverlay').count()===1;r.stillGames=await p.evaluate(()=>document.getElementById('games').classList.contains('active'));
  r.aMarkedOn=(await p.locator('.hmv-pick-item.on').innerText().catch(()=>'')).includes('Bộ thử A');
  await p.locator('.hmv-pick-item[data-set-id="test-BBB"]').click();await p.waitForTimeout(900);
  const s=await txt();r.settingsShowsB=s.includes('Bộ thử B');r.settingsShowsA=s.includes('Bộ thử A');
  r.engine=await p.evaluate(t=>{const l=hmvC6QuestionsForGame(t)||[];return l.length&&l.every(q=>/^BBB/.test(q.text))},t);
 }else{
  r.panelNoteA=(await p.locator('#games .hmv-src-note').innerText().catch(()=>'')).includes('Bộ thử A');
  r.dropdownShowsA=await p.evaluate(t=>document.getElementById(t+'Set')?.value==='test-AAA',t);
  // đổi bằng dropdown của trò
  await p.evaluate(t=>{const s=document.getElementById(t+'Source');s.value='set';s.dispatchEvent(new Event('change'));},t);await p.waitForTimeout(300);
  await p.evaluate(t=>{const s=document.getElementById(t+'Set');s.value='test-BBB';s.dispatchEvent(new Event('change'));},t);await p.waitForTimeout(300);
  await p.evaluate(t=>hmvStage5PlayNow(t),t);await p.waitForTimeout(2500);
  const s=await txt();r.dropdownPlaysB=!/AAA/.test(s)&&await p.evaluate(t=>{const l=hmvC6QuestionsForGame(t)||[];return l.length>0&&l.every(q=>/^BBB/.test(q.text))},t);if(!r.dropdownPlaysB)r.dbg=s.slice(0,300);
  await leave();await p.waitForTimeout(300);
  // đổi bằng nút Chọn bộ từ Kho trong bảng
  await p.evaluate(t=>gameSetup(t),t);await p.waitForTimeout(600);
  await p.locator('#games .hmv-src-pick').click();await p.locator('.hmv-pick-item[data-set-id="test-AAA"]').click();await p.waitForTimeout(700);
  r.panelNoteAfterPick=(await p.locator('#games .hmv-src-note').innerText().catch(()=>'')).includes('Bộ thử A');
  await p.evaluate(t=>hmvStage5PlayNow(t),t);await p.waitForTimeout(2500);
  const s2=await txt();r.pickPlaysA=!/BBB/.test(s2)&&await p.evaluate(t=>{const l=hmvC6QuestionsForGame(t)||[];return l.length>0&&l.every(q=>/^AAA/.test(q.text))},t);
 }
 await leave();await p.waitForTimeout(300);
 // 3. Màn hình chính của trò: đổi bộ tại chỗ
 await p.evaluate(t=>hmvQr.openGame(t),t);await p.waitForTimeout(500);
 await p.locator('#hmvQrLanding .hmv-entry-set button').click();await p.locator('.hmv-pick-item[data-set-id="test-BBB"]').click();await p.waitForTimeout(400);
 r.landingShowsB=(await p.locator('#hmvQrLanding .hmv-entry-set span').innerText()).includes('Bộ thử B');
 r.engineB=await p.evaluate(t=>{const l=hmvC6QuestionsForGame(t)||[];return l.length>0&&l.every(q=>/^BBB/.test(q.text))},t);
 // 4. Chiều xuôi vẫn đúng sau khi đổi ngược
 await leave();r.forwardAgain=await p.evaluate(t=>{hmvC6PlayBankSet(t,'test-AAA');const l=hmvC6QuestionsForGame(t)||[];return l.length>0&&l.every(q=>/^AAA/.test(q.text))},t);
 r.errors=errs;res[t]=r;console.log(t,JSON.stringify(r));
 const must=['forward','landingShowsB','engineB','forwardAgain'].concat(MOD.includes(t)?['pickerOpen','stillGames','aMarkedOn','settingsShowsB','engine']:['panelNoteA','dropdownShowsA','dropdownPlaysB','panelNoteAfterPick','pickPlaysA']);
 must.forEach(k=>assert.equal(r[k],true,t+' '+k));assert.deepEqual(errs,[],t+' errors');await ctx.close();}
console.log('PASS: hai chieu 2.18');await b.close();})().catch(e=>{console.error(e);process.exitCode=1});
