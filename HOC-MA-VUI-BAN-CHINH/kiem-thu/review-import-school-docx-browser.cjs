'use strict';
// Mẫu đề Word của trường: nhập → 15 câu (Câu 8 tách 4 vở ô li), đủ điểm 10, đáp án trắc nghiệm tự điền, môn/chủ đề tự nhận, phần ĐÁP ÁN không thành câu hỏi thừa → xuất gói SCORM.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs');
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
    await p.locator('#rv-import').setInputFiles(path.join(__dirname,'files/de-toan-ghk1-mau-truong.docx'));
    await p.waitForSelector('#rv-export-scorm');
    assert.equal(await p.locator('[data-question]').count(),15);
    assert.equal(await p.locator('#rv-edit-subject').inputValue(),'Toán');assert.equal(await p.locator('#rv-topic').inputValue(),'Kiểm tra giữa học kì I');
    const w=p.waitForEvent('download');await p.locator('#rv-export-html').click();const d=await w;const f=path.join(output,'de.html');await d.saveAs(f);
    const out=fs.readFileSync(f,'utf8');const data=JSON.parse(out.match(/\(function runtime[\s\S]*?\}\)\((\{[\s\S]*\})\);<\/script>/)[1].replace(/\\u003c/g,'<'));
    assert.equal(data.questions.length,15);assert.equal(data.questions.reduce((n,q)=>n+q.points,0),10);
    assert.deepEqual(data.questions.slice(0,6).map(q=>q.correctAnswers[0]),[1,3,0,2,3,1]);
    assert.deepEqual(data.questions.filter(q=>q.answerLayout==='grid-calculation').map(q=>q.text.slice(q.text.indexOf('tính: ')+6)),['243625 + 132284','586742 − 243561','2306 × 4','4685 : 5']);
    assert.doesNotMatch(out,/Đặt tính đúng và tính đúng kết quả: 0,5 điểm|Mỗi bước có lời giải phù hợp/,'hướng dẫn chấm tự luận không lộ trong trang học sinh');
    const w2=p.waitForEvent('download');await p.locator('#rv-export-scorm').click();const d2=await w2;assert.match(d2.suggestedFilename(),/\.zip$/);
    console.log('PASS mẫu đề Word của trường: 15 câu, 10 điểm, đáp án Câu 1–6 = B D A C D B, Câu 8 thành 4 vở ô li, tự nhận môn/chủ đề, xuất HTML và SCORM');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
