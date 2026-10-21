'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs'),domain=require('../app/review-domain.js'),fixture=require('./fixtures/review-math4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),app=path.resolve(__dirname,'../app');
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('hmv-practice-v1-')))));
const results=[];const pass=(id,text)=>{results.push({id,status:'PASS',text});console.log(id+' PASS '+text);};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  const errors=[],network=[];
  const make=limit=>({...structuredClone(fixture),metadata:{...fixture.metadata,purpose:'Bài tập thường xuyên',...(limit===undefined?{}:{attemptLimit:limit})}});
  async function open(name,limit){const file=path.join(output,name+'.html');fs.writeFileSync(file,html.renderHtml(make(limit)));const context=await browser.newContext({offline:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await page.goto(pathToFileURL(file).href);return {context,page};}
  async function submit(page,correct){if(correct)for(let i=0;i<fixture.questions.length;i++)await page.locator(`input[name=q${i}][value="${fixture.questions[i].correctAnswers[0]}"]`).check();page.once('dialog',d=>d.accept());await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.length>0);}
  async function retry(page){await Promise.all([page.waitForEvent('load'),page.locator('#retry').click()]);}
  try{
    const {context,page}=await open('luyen-tap-2-luot',2);
    await page.locator('input[name=q0]').first().check();await page.reload();assert.equal((await read(page)).submissions.length,0);assert.equal((await read(page)).attempt.status,'in-progress');
    page.once('dialog',d=>d.dismiss());await page.locator('#submit').click();assert.equal((await read(page)).submissions.length,0);pass('C','draft/reload/cancel do not consume a turn');
    await submit(page,true);const first=(await read(page)).submissions[0];assert.equal(first.score,10);assert.equal(await page.locator('#retry').isVisible(),true);
    await page.reload();assert.equal((await read(page)).submissions.length,1);assert.equal((await read(page)).attempt.id,first.id);pass('B','submitted count and locked result survive reload');
    await retry(page);assert.equal((await read(page)).submissions.length,1);assert.notEqual((await read(page)).attempt.id,first.id);
    await submit(page,false);let saved=await read(page);assert.equal(saved.submissions.length,2);assert.deepEqual(saved.submissions[0],first);assert.equal(saved.submissions[1].score,0);assert.notEqual(saved.submissions[0].id,saved.submissions[1].id);
    assert.equal(await page.locator('#retry').isHidden(),true);assert.match(await page.locator('#attempt-limit-status').textContent(),/Em đã sử dụng hết lượt làm bài/);
    await page.reload();assert.equal((await read(page)).submissions.length,2);assert.equal(await page.locator('#retry').isHidden(),true);pass('A','2 submissions lock retry; separate immutable 10/10 and 0/10 records retained');await context.close();
    const unlimited=await open('luyen-tap-khong-gioi-han','unlimited');
    for(let i=0;i<4;i++){await submit(unlimited.page,false);assert.equal(await unlimited.page.locator('#retry').isVisible(),true);if(i<3)await retry(unlimited.page);}
    assert.equal((await read(unlimited.page)).submissions.length,4);await unlimited.page.reload();assert.equal((await read(unlimited.page)).submissions.length,4);pass('D','unlimited allows 4 separate submissions and reload');await unlimited.context.close();
    const legacy=await open('de-cu-khong-cau-hinh',undefined);await submit(legacy.page,true);await legacy.page.reload();assert.equal((await read(legacy.page)).submissions,undefined);assert.equal(await legacy.page.locator('#retry').isHidden(),true);assert.match(await legacy.page.locator('#result').textContent(),/10 \/ 10/);pass('E','legacy remains single locked saved result without a new limit or retry');await legacy.context.close();
    const failed=await open('loi-luu-luot',2);await failed.page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('test storage denied');};});failed.page.once('dialog',d=>d.accept());await failed.page.locator('#submit').click();assert.equal((await read(failed.page)).submissions.length,0);assert.equal((await read(failed.page)).attempt.status,'in-progress');assert.equal(await failed.page.locator('#submit').isEnabled(),true);assert.match(await failed.page.locator('#save-status').textContent(),/Chưa lưu được lượt nộp/);await failed.context.close();pass('save-failure','failed persistence does not consume or lock a submission');
    const server=http.createServer((req,res)=>{const target=path.resolve(app,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!target.startsWith(app+path.sep)){res.writeHead(403);return res.end();}fs.readFile(target,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(target)]||'application/octet-stream'});res.end(err?'Not found':data);});});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{
      const origin='http://127.0.0.1:'+server.address().port,ec=await browser.newContext({acceptDownloads:true});await ec.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const ep=await ec.newPage();await ep.goto(origin+'/');await ep.waitForFunction(()=>!!window.HmvReviewUI);await ep.evaluate(()=>HmvReviewUI.open());await ep.locator('#rv-new').click();assert.equal(await ep.locator('#rv-attempt-limit').inputValue(),'3');
      const original=domain.normalizeDocument(make(undefined));await ep.evaluate(async d=>{await(await HmvReviewStorage.open()).put('documents',d);},original);await ep.evaluate(()=>HmvReviewUI.open());await ep.locator(`[data-rv-open="${original.id}"]`).click();assert.equal(await ep.locator('#rv-attempt-limit').inputValue(),'legacy');await ep.locator('#rv-save').click();await ep.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));assert.equal((await ep.evaluate(async id=>(await(await HmvReviewStorage.open()).get('documents',id)).metadata,original.id)).attemptLimit,undefined);
      await ep.locator('#rv-attempt-limit').selectOption('2');const wait=ep.waitForEvent('download');await ep.locator('#rv-export-html').click();const download=await wait;await download.saveAs(path.join(output,'tu-trinh-bien-tap-2-luot.html'));await ep.locator('#rv-save').click();await ep.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));assert.equal((await ep.evaluate(async id=>(await(await HmvReviewStorage.open()).get('documents',id)).metadata,original.id)).attemptLimit,2);
      await ep.locator('#rv-purpose').selectOption('Đề kiểm tra');assert.equal(await ep.locator('#rv-attempt-limit').isVisible(),false);await ec.close();pass('editor','new default 3, legacy preserved, selected 2 saved/exported; assessment hides setting');
    }finally{await new Promise(resolve=>server.close(resolve));}
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,errors,network},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
