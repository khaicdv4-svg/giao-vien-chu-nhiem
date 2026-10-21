'use strict';
// Quy trình giáo viên: nhập tệp đề (.txt/.docx/.pdf) → trình biên tập → xuất gói SCORM và HTML, không bị chặn bởi "trang văn bản gốc".
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),app=path.resolve(__dirname,'../app');
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const server=http.createServer((req,res)=>{const t=path.resolve(app,'.'+new URL(req.url,'http://x').pathname.replace(/^\/$/,'/index.html'));if(!t.startsWith(app+path.sep)){res.writeHead(403);return res.end();}fs.readFile(t,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(t)]||'application/octet-stream'});res.end(e?'':d);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});const errors=[];
  try{
    const c=await browser.newContext({acceptDownloads:true});await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForFunction(()=>!!window.HmvReviewUI);
    await p.evaluate(()=>HmvReviewUI.open());
    await p.locator('#rv-import').setInputFiles(path.join(__dirname,'files/mixed100.txt'));
    await p.waitForSelector('#rv-export-scorm');
    const n=await p.locator('[data-question]').count();assert.equal(n,100);
    await p.locator('#rv-edit-subject').fill('Toán');await p.locator('#rv-topic').fill('Ôn tập cuối kì');
    let w=p.waitForEvent('download');await p.locator('#rv-export-scorm').click();let d=await w;
    assert.match(d.suggestedFilename(),/^scorm-.*\.zip$/);const z=path.join(output,d.suggestedFilename());await d.saveAs(z);
    const buf=fs.readFileSync(z);assert.ok(buf.includes(Buffer.from('imsmanifest.xml'))&&buf.includes(Buffer.from('index.html')));
    w=p.waitForEvent('download');await p.locator('#rv-export-html').click();d=await w;await d.saveAs(path.join(output,'tu-nhap.html'));
    const htmlText=fs.readFileSync(path.join(output,'tu-nhap.html'),'utf8');assert.equal((htmlText.match(/class="question-card/g)||[]).length,100);
    assert.doesNotMatch(await p.locator('#rv-message').textContent(),/ngữ liệu liên kết/);
    console.log('PASS nhập 100 câu từ tệp → xuất gói SCORM và HTML 100 câu, không còn lỗi "ngữ liệu liên kết"');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
