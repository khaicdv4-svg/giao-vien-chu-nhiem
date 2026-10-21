'use strict';
// Real Service Worker and CacheStorage; no route.fulfill or synthetic app shell.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const D=require('../app/review-domain.js');
const fixture=D.normalizeDocument(require('./fixtures/review-math4.json'));
const app=path.resolve(__dirname,'../app');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR);
const rows=[],hits=[],missing=[],errors=[];
let serverStopped=false,phase='online';
const marker='SYNTHETIC-CACHE-EXCLUSION-PROBE';
const record=(id,status,evidence)=>{rows.push({id,status,evidence});console.log(id+' '+status+' '+evidence);};
const server=http.createServer((req,res)=>{
  hits.push({phase,url:req.url});
  if(['/api/cache-probe','/auth/v1/user','/private-assessment.json'].includes(req.url)){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({probe:marker}));
  }
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(app,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(app+path.sep)){res.writeHead(403);return res.end();}
  const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  fs.readFile(file,(error,bytes)=>{if(error)missing.push(req.url);res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(error?'Not found':bytes);});
});
async function main(){
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  try{
    const context=await browser.newContext({serviceWorkers:'allow',acceptDownloads:true,viewport:{width:390,height:844}});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push({phase,message:error.message}));
    const origin='http://127.0.0.1:'+server.address().port;
    // Block external page requests; SW uses only local shell resources in this test.
    await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    const served=[];page.on('response',response=>{if(phase==='offline')served.push({url:response.url(),serviceWorker:response.fromServiceWorker()});});
    await page.goto(origin+'/');await page.waitForFunction(()=>!!window.HmvReviewUI);
    record('A','PASS','Opened actual PWA online on isolated loopback origin, fresh context');
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:45000});
    const state=await page.evaluate(async()=>{
      const reg=await navigator.serviceWorker.ready;
      const names=await caches.keys();const urls=[];
      for(const name of names){for(const request of await(await caches.open(name)).keys())urls.push(request.url);}
      return {worker:reg.active.state,scriptURL:reg.active.scriptURL,names,urls};
    });
    const required=['/','/index.html','/review-domain.js','/review-html.js','/review-ui.js','/review-storage.js','/review.css'];
    for(const file of required)assert.ok(state.urls.includes(origin+file),'Missing cached '+file);
    assert.equal(state.worker,'activated');
    fs.writeFileSync(path.join(output,'cache-before.json'),JSON.stringify(state,null,2));
    record('B','PASS','Active controller and required app/export resources verified in CacheStorage');
    // Exercise cache boundaries with local synthetic responses, never real credentials/data.
    await page.evaluate(async()=>{
      await fetch('/api/cache-probe');await fetch('/auth/v1/user');await fetch('/private-assessment.json');
      await fetch('/review-domain.js?cache-probe=private',{headers:{Authorization:'test-cache-exclusion'}});
    });
    const excluded=await page.evaluate(async()=>{
      const urls=[];for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys()){
        const response=await(await caches.open(name)).match(request);
        if(request.url.includes('cache-probe')||request.url.includes('/auth/')||request.url.includes('private-assessment'))urls.push(request.url);
        if((await response.clone().text()).includes('SYNTHETIC-CACHE-EXCLUSION-PROBE'))urls.push('sensitive-response-body');
      }return urls;
    });
    record('CACHE-SAFETY',excluded.length?'FAIL':'PASS',excluded.length?'Synthetic private response entered CacheStorage: '+JSON.stringify(excluded):'API/auth/private JSON/Authorization probes absent from CacheStorage');
    await page.evaluate(async raw=>await(await HmvReviewStorage.open()).put('documents',raw),fixture);
    await page.evaluate(()=>HmvReviewUI.open());await page.locator('[data-rv-open="'+fixture.id+'"]').click();
    const original=await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id);
    phase='offline';await context.setOffline(true);
    await new Promise(resolve=>server.close(resolve));serverStopped=true;
    assert.equal(await page.evaluate(()=>navigator.onLine),false);
    record('C','PASS','Browser network disabled and loopback server stopped; HTTP cache disabled');
    await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!!window.HmvReviewUI);
    assert.ok(served.some(r=>r.url===origin+'/'&&r.serviceWorker));
    for(const file of ['/review-domain.js','/review-html.js','/review-ui.js'])assert.ok(served.some(r=>r.url===origin+file&&r.serviceWorker),'Not served by SW '+file);
    record('D','PASS','Offline reload served document and editor/export JS by real Service Worker');
    await page.evaluate(()=>HmvReviewUI.open());await page.locator('[data-rv-open="'+fixture.id+'"]').click();
    assert.equal(await page.locator('[data-question="0"] [data-q="text"]').inputValue(),fixture.questions[0].text);
    const edited='125 + 276 bằng bao nhiêu? (Sửa khi PWA offline)';
    await page.locator('[data-question="0"] [data-q="text"]').fill(edited);
    await page.locator('[data-question="0"] [data-option="0"]').fill('401');
    await page.locator('[data-question="0"] [data-key="0"]').check();
    record('E','PASS','Existing editor restored IndexedDB draft after reload and accepted offline edits');
    const downloaded=page.waitForEvent('download');await page.locator('#rv-export-html').click();
    const download=await downloaded;
    record('F','PASS','Actual export button generated download offline; no backend or sample replacement');
    const file=path.join(output,'toan-4-xuat-tu-pwa-offline.html');await download.saveAs(file);
    assert.ok(fs.statSync(file).size>1000);assert.match(download.suggestedFilename(),/\.html$/);
    record('G','PASS','HTML download saved, valid HTML extension and nonempty file');
    assert.deepEqual(await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id),original);
    assert.equal(await page.locator('#rv-review').isDisabled(),true);assert.equal(await page.locator('#rv-publish').isDisabled(),true);
    await page.screenshot({path:path.join(output,'editor-offline.png')});
    const studentContext=await browser.newContext({offline:true,viewport:{width:390,height:844}});
    const student=await studentContext.newPage(),studentErrors=[],studentNetwork=[];
    student.on('pageerror',e=>studentErrors.push(e.message));student.on('request',r=>{if(/^https?:/.test(r.url()))studentNetwork.push(r.url());});
    await student.goto(pathToFileURL(file).href);
    assert.equal(await student.locator('fieldset').first().locator('p').first().textContent(),edited);
    for(const [i,key] of [0,0,2,3,1].entries())await student.locator(`input[name=q${i}][value="${key}"]`).check();
    student.once('dialog',dialog=>dialog.accept());await student.locator('#submit').click();
    record('H','PASS','Downloaded file opened and all five questions answered in separate offline context');
    assert.equal(await student.locator('#result').textContent(),'Kết quả: 10 / 10 điểm');
    await student.screenshot({path:path.join(output,'result-offline.png'),fullPage:true});
    assert.deepEqual(studentNetwork,[]);assert.deepEqual(studentErrors,[]);
    record('I','PASS','Edited answer key graded 10/10 offline, no network or JavaScript errors');
    await page.reload();await page.waitForFunction(()=>!!window.HmvReviewUI);
    assert.deepEqual(await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id),original);
    const cacheAfter=await page.evaluate(async()=>{
      const urls=[];for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys())urls.push(request.url);return urls;
    });
    assert.ok(!cacheAfter.some(url=>url.includes('blob:')||url.includes('toan-4-xuat')));
    record('J','PASS','Original IndexedDB draft unchanged after export and second reload; unsaved export edits not persisted; output not cached');
    fs.writeFileSync(path.join(output,'offline-responses.json'),JSON.stringify({served,cacheAfter,errors,hits,missing},null,2));
    assert.deepEqual(errors,[]);
    assert.equal(rows.filter(row=>row.status==='FAIL').length,0,'Cache safety must also pass');
    await studentContext.close();await context.close();
  }catch(error){record('RUN','FAIL',error.message);throw error;}
  finally{
    await browser.close();if(!serverStopped)await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({rows,missing,errors},null,2));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
