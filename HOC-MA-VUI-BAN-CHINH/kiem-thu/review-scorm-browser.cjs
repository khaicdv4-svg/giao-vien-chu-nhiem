'use strict';
// Gói SCORM chạy trong LMS giả lập (SCORM 1.2 và 2004): khởi tạo, nộp bài báo điểm phần tự chấm, tải lại không mất kết quả,
// không có LMS thì vẫn chạy như HTML thường; nút "Xuất gói SCORM (QLMS)" trong trình biên tập tải đúng gói.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs'),domain=require('../app/review-domain.js'),fixture=require('./fixtures/review-combined4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),app=path.resolve(__dirname,'../app');
const pass=(id,t)=>console.log(id+' PASS '+t);
const LMS12=`<script>window.calls=[];window.store={'cmi.core.student_name':'Nguyễn, Văn An','cmi.core.lesson_status':'not attempted'};
window.API={LMSInitialize:a=>{calls.push(['init']);return 'true'},LMSGetValue:k=>store[k]||'',LMSSetValue:(k,v)=>{calls.push(['set',k,v]);store[k]=v;return 'true'},LMSCommit:()=>{calls.push(['commit']);return 'true'},LMSFinish:()=>{calls.push(['finish']);return 'true'},LMSGetLastError:()=>'0',LMSGetErrorString:()=>'',LMSGetDiagnostic:()=>''};</script><iframe id="sco" src="/sco/index.html" style="width:400px;height:900px"></iframe>`;
const LMS2004=`<script>window.calls=[];window.store={'cmi.learner_name':'Trần Thị Bình'};
window.API_1484_11={Initialize:()=>'true',GetValue:k=>store[k]||'',SetValue:(k,v)=>{calls.push(['set',k,v]);store[k]=v;return 'true'},Commit:()=>'true',Terminate:()=>'true',GetLastError:()=>'0',GetErrorString:()=>'',GetDiagnostic:()=>''};</script><iframe id="sco" src="/sco/index.html" style="width:400px;height:900px"></iframe>`;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const pkgFile=path.join(output,'goi-scorm.zip');fs.writeFileSync(pkgFile,html.renderScormPackage(fixture));
  const sco=html.renderHtml(fixture);let lms=LMS12;
  const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://x').pathname;
    if(u==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<!doctype html><meta charset="utf-8">'+lms);}
    if(u==='/sco/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(sco);}
    const t=path.resolve(app,'.'+u.replace(/^\/app/,'').replace(/^\/$/,'/index.html'));if(!u.startsWith('/app/')||!t.startsWith(app+path.sep)){res.writeHead(404);return res.end();}
    fs.readFile(t,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(t)]||'application/octet-stream'});res.end(e?'':d);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});const errors=[];
  try{
    const ctx=await browser.newContext({viewport:{width:420,height:950}});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
    p.on('dialog',d=>d.accept());await p.goto(origin+'/');const f=p.frameLocator('#sco');await f.locator('#submit').waitFor();
    let calls=await p.evaluate(()=>calls);assert.deepEqual(calls[0],['init']);assert.ok(calls.some(c=>c[1]==='cmi.core.lesson_status'&&c[2]==='incomplete'));
    pass('init-12','mở trong LMS SCORM 1.2: khởi tạo, đặt trạng thái "đang làm"');
    await f.locator('input[name=q0][value="1"]').check();await f.locator('input[name=q5]').fill('100000');
    await f.locator('#submit').click();await p.waitForFunction(()=>store['cmi.core.lesson_status']==='completed');
    const st=await p.evaluate(()=>store);
    assert.equal(st['cmi.core.score.raw'],'2');assert.equal(st['cmi.core.score.max'],'10');assert.equal(st['cmi.core.score.min'],'0');
    assert.match(await f.locator('#send-status').textContent(),/Đã gửi kết quả về hệ thống học tập/);
    pass('report-12','nộp bài: điểm tự chấm 2/10 (max = tổng điểm đề), trạng thái completed, có commit, học sinh thấy thông báo đã gửi');
    await p.evaluate(()=>{calls.length=0;});await p.reload();await f.locator('#submit').waitFor();
    assert.match(await f.locator('#result').textContent(),/Đã chấm/);
    assert.equal(await p.evaluate(()=>store['cmi.core.lesson_status']),'completed');
    pass('reload-12','tải lại: kết quả vẫn còn, trạng thái không bị lùi về "đang làm"');
    await ctx.close();
    lms=LMS2004;const c2=await browser.newContext();const p2=await c2.newPage();p2.on('pageerror',e=>errors.push(e.message));p2.on('dialog',d=>d.accept());
    await p2.goto(origin+'/');const f2=p2.frameLocator('#sco');await f2.locator('#submit').waitFor();
    for(let i=0;i<3;i++)await f2.locator(`[data-matching="4"] [data-a="${i}"]`).click().then(()=>f2.locator(`[data-matching="4"] [data-b="${i}"]`).click());
    await f2.locator('#submit').click();await p2.waitForFunction(()=>store['cmi.completion_status']==='completed');
    const s2=await p2.evaluate(()=>store);assert.equal(s2['cmi.score.raw'],'1');assert.equal(s2['cmi.score.scaled'],'0.1');
    await c2.close();pass('report-2004','SCORM 2004: điểm 1/10, scaled 0.1, completed');
    const c3=await browser.newContext({offline:true});const p3=await c3.newPage();p3.on('pageerror',e=>errors.push(e.message));p3.on('dialog',d=>d.accept());
    const plain=path.join(output,'thuong.html');fs.writeFileSync(plain,sco);await p3.goto(pathToFileURL(plain).href);
    await p3.locator('input[name=q0][value="1"]').check();await p3.locator('#submit').click();await p3.waitForFunction(()=>document.querySelector('#result').textContent.length>0);
    assert.equal(await p3.locator('#send-status').textContent(),'');await c3.close();pass('no-lms','mở file trực tiếp (không có LMS): chạy như cũ, không báo lỗi');
    const ec=await browser.newContext({acceptDownloads:true});await ec.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const ep=await ec.newPage();ep.on('pageerror',e=>errors.push('editor: '+e.message));await ep.goto(origin+'/app/');await ep.waitForFunction(()=>!!window.HmvReviewUI);
    const d=domain.normalizeDocument(fixture);await ep.evaluate(async x=>{await(await HmvReviewStorage.open()).put('documents',x);},d);
    await ep.evaluate(()=>HmvReviewUI.open());await ep.locator(`[data-rv-open="${d.id}"]`).click();
    const w=ep.waitForEvent('download');await ep.locator('#rv-export-scorm').click();const dl=await w;
    assert.match(dl.suggestedFilename(),/^scorm-.*\.zip$/);const out=path.join(output,'tu-bien-tap.zip');await dl.saveAs(out);
    const buf=fs.readFileSync(out);assert.equal(buf.readUInt32LE(0),0x04034b50);assert.ok(buf.includes(Buffer.from('imsmanifest.xml')));
    assert.match(await ep.locator('#rv-message').textContent(),/Scorm/);await ec.close();
    pass('editor','nút "Xuất gói SCORM (QLMS)" tải tệp .zip có imsmanifest.xml và hướng dẫn tải lên QLMS');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
