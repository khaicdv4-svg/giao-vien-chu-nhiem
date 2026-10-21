'use strict';
// Lệnh 08A – kiểm thử trình duyệt: nhập họ tên → nộp → tự gửi về Google Apps Script (giả lập) → lỗi mạng → gửi lại → không gửi trùng.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs'),domain=require('../app/review-domain.js'),fixture=require('./fixtures/review-combined4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),app=path.resolve(__dirname,'../app');
const URL_OK='https://script.google.com/macros/s/AKfycbx1234567890abcdefghijKLMN/exec';
const rows=[];const pass=(id,t)=>{rows.push({id,status:'PASS',t});console.log(id+' PASS '+t);};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const doc=structuredClone(fixture);doc.metadata.submitUrl=URL_OK;
  const file=path.join(output,'de-nop-truc-tuyen.html');fs.writeFileSync(file,html.renderHtml(doc));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  const errors=[],received=[],other=[];let mode='ok';
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:900},hasTouch:true,isMobile:true});
    await ctx.route('**/*',async r=>{const u=r.request().url();
      if(u===URL_OK){if(mode==='down')return r.abort('internetdisconnected');received.push(JSON.parse(r.request().postData()));return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({ok:true})});}
      if(u.startsWith('https://script.googleusercontent.com/'))return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({ok:true})});
      if(/^https?:/.test(u)){other.push(u);return r.abort();}return r.continue();});
    const p=await ctx.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
    await p.goto(pathToFileURL(file).href);
    await p.locator('input[name=q0][value="1"]').check();
    p.on('dialog',d=>d.accept());
    await p.locator('#submit').click();
    assert.match(await p.locator('.submit-panel p').textContent(),/nhập họ và tên/);assert.equal(received.length,0);
    assert.equal(await p.evaluate(()=>document.activeElement.id),'student-name');
    await p.locator('#student-name').fill('Nguyễn Văn An');await p.reload();
    assert.equal(await p.locator('#student-name').inputValue(),'Nguyễn Văn An');
    pass('name','chưa nhập họ tên thì không nộp, con trỏ về ô họ tên; họ tên giữ sau tải lại');
    await p.locator('#submit').click();
    await p.waitForFunction(()=>/Đã gửi bài/.test(document.querySelector('#send-status').textContent));
    assert.equal(received.length,1);const sent=received[0];
    assert.equal(sent.studentName,'Nguyễn Văn An');assert.equal(sent.kind,'hmv-online-submission');assert.equal(sent.documentId,'combined-math4');
    assert.equal(sent.results.length,8);assert.equal(sent.pendingManual,2);
    const raw=JSON.stringify(sent);assert.ok(!raw.includes('correctAnswers')&&!raw.includes('Lời giải đúng: 1 điểm')&&!raw.includes('"answer":true'),'gửi kèm đáp án');
    assert.equal(await p.locator('#student-name').isDisabled(),true);assert.equal(await p.locator('#resend').isHidden(),true);
    await p.reload();await p.waitForTimeout(300);assert.equal(received.length,1);
    pass('send-ok','nộp xong tự gửi 1 lần , có họ tên và điểm, không kèm đáp án; tải lại không gửi trùng');
    // Lượt 2, mất mạng rồi gửi lại
    await Promise.all([p.waitForEvent('load'),p.locator('#retry').click()]);
    assert.equal(await p.locator('#student-name').inputValue(),'Nguyễn Văn An');
    mode='down';await p.locator('input[name=q0][value="0"]').check();await p.locator('#submit').click();
    await p.waitForFunction(()=>/Chưa gửi được/.test(document.querySelector('#send-status').textContent));
    assert.equal(await p.locator('#resend').isVisible(),true);assert.equal(received.length,1);
    await p.reload();await p.waitForFunction(()=>/Chưa gửi được/.test(document.querySelector('#send-status').textContent));
    mode='ok';await p.locator('#resend').click();
    await p.waitForFunction(()=>/Đã gửi bài/.test(document.querySelector('#send-status').textContent));
    assert.equal(received.length,2);assert.notEqual(received[1].submissionId,received[0].submissionId);assert.equal(await p.locator('#resend').isHidden(),true);
    await p.reload();await p.waitForTimeout(300);assert.equal(received.length,2);
    pass('resend','mất mạng: báo chưa gửi, giữ bài, có nút Gửi lại (kể cả sau tải lại); gửi lại thành công chỉ gửi lượt chưa gửi');
    await p.screenshot({path:path.join(output,'390-da-gui.png'),fullPage:true});await ctx.close();
    // Đề không cấu hình: không có ô họ tên, không gửi gì
    const plain=path.join(output,'de-khong-gui.html');fs.writeFileSync(plain,html.renderHtml(fixture));
    const c2=await browser.newContext({offline:true});const p2=await c2.newPage();p2.on('pageerror',e=>errors.push(e.message));p2.on('dialog',d=>d.accept());
    await p2.goto(pathToFileURL(plain).href);assert.equal(await p2.locator('#student-name').count(),0);
    await p2.locator('input[name=q0][value="1"]').check();await p2.locator('#submit').click();
    await p2.waitForFunction(()=>document.querySelector('#result').textContent.length>0);assert.equal(await p2.locator('#send-status').textContent(),'');await c2.close();
    pass('legacy','đề không cấu hình nhận bài: giữ nguyên cách cũ, không có ô họ tên, không gửi mạng');
    // Trình biên tập: lưu và xuất đường dẫn; từ chối đường dẫn sai
    const server=http.createServer((req,res)=>{const t=path.resolve(app,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!t.startsWith(app+path.sep)){res.writeHead(403);return res.end();}fs.readFile(t,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(t)]||'application/octet-stream'});res.end(err?'Not found':data);});});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{
      const origin='http://127.0.0.1:'+server.address().port,ec=await browser.newContext({acceptDownloads:true});await ec.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
      const ep=await ec.newPage();ep.on('pageerror',e=>errors.push('editor: '+e.message));await ep.goto(origin+'/');await ep.waitForFunction(()=>!!window.HmvReviewUI);
      const d=domain.normalizeDocument(fixture);await ep.evaluate(async x=>{await(await HmvReviewStorage.open()).put('documents',x);},d);
      await ep.evaluate(()=>HmvReviewUI.open());await ep.locator(`[data-rv-open="${d.id}"]`).click();
      assert.equal(await ep.locator('#rv-submit-url').inputValue(),'');
      await ep.locator('#rv-submit-url').fill('https://evil.example/x');await ep.locator('#rv-export-html').click();
      await ep.waitForFunction(()=>/Google Apps Script/.test(document.querySelector('#rv-message').textContent));
      await ep.locator('#rv-submit-url').fill(URL_OK);await ep.locator('#rv-save').click();await ep.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));
      assert.equal((await ep.evaluate(async id=>(await(await HmvReviewStorage.open()).get('documents',id)).metadata,d.id)).submitUrl,URL_OK);
      const w=ep.waitForEvent('download');await ep.locator('#rv-export-html').click();const dl=await w;const out=path.join(output,'tu-bien-tap.html');await dl.saveAs(out);
      const text=fs.readFileSync(out,'utf8');assert.ok(text.includes(URL_OK));assert.match(text,/id="student-name"/);
      await ep.locator('#rv-submit-url').fill('');await ep.locator('#rv-save').click();await ep.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));
      assert.equal((await ep.evaluate(async id=>(await(await HmvReviewStorage.open()).get('documents',id)).metadata,d.id)).submitUrl,undefined);
      await ec.close();pass('editor','ô đường dẫn nhận bài: báo lỗi đường dẫn sai, lưu/xuất đường dẫn đúng, xóa được');
    }finally{await new Promise(r=>server.close(r));}
    assert.deepEqual(errors,[]);assert.deepEqual(other,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({rows,errors},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
