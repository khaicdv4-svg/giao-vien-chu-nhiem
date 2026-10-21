'use strict';
// Lệnh 07 – kiểm thử trình duyệt đề tổng hợp 8 dạng: biên tập → lưu → xuất HTML → làm → nháp → nộp → kết quả → lời giải → làm lại.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const domain=require('../app/review-domain.js'),fixture=require('./fixtures/review-combined4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR),app=path.resolve(__dirname,'../app');
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('hmv-practice-v1-')))));
const rows=[];const pass=(id,t)=>{rows.push({id,status:'PASS',t});console.log(id+' PASS '+t);};
const cell=(p,r,c)=>p.locator(`[data-grid-question="7"] .grid-cell[data-row="${r}"][data-col="${c}"]`);
async function connect(p,a,b){await p.locator(`[data-matching="4"] [data-a="${a}"]`).click();await p.locator(`[data-matching="4"] [data-b="${b}"]`).click();}
async function answerPartial(p){
  await p.locator('input[name=q0][value="0"]').check();
  await p.locator('input[name=q1s0][value=true]').check();await p.locator('input[name=q1s1][value=true]').check();await p.locator('input[name=q1s2][value=true]').check();
  await p.locator('input[name=q2][value="0"]').check();
  await p.locator('[name=q3b1]').fill('120');await p.locator('[name=q3b2]').fill('30');await p.locator('[name=q3b3]').fill('5000');
  await connect(p,0,1);await connect(p,1,0);await connect(p,2,2);
  await p.locator('[name=q5]').fill('100 000');
  await p.locator('[name=q6]').fill('Số gạo còn lại là:\n1250 - 475 = 775 (kg)\nĐáp số: 775 kg');
}
async function answerFull(p){
  await p.locator('input[name=q0][value="3"]').check(); // cố ý sai câu 1 để kiểm tra lời giải sau khi hết lượt
  await p.locator('input[name=q1s0][value=true]').check();await p.locator('input[name=q1s1][value=false]').check();await p.locator('input[name=q1s2][value=true]').check();
  for(const v of ['0','2'])await p.locator(`input[name=q2][value="${v}"]`).check();
  await p.locator('[name=q3b1]').fill('120');await p.locator('[name=q3b2]').fill('300');await p.locator('[name=q3b3]').fill('5 000');
  for(let i=0;i<3;i++)await connect(p,i,i);
  await p.locator('[name=q5]').fill('100000');
  await p.locator('[name=q6]').fill('1250 - 475 = 775 (kg)');
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  const errors=[],network=[];let exported;
  const server=http.createServer((req,res)=>{const target=path.resolve(app,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!target.startsWith(app+path.sep)){res.writeHead(403);return res.end();}fs.readFile(target,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(target)]||'application/octet-stream'});res.end(err?'Not found':data);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    // 1. Giáo viên: mở đề trong trình biên tập, lưu, xuất HTML
    const origin='http://127.0.0.1:'+server.address().port,ec=await browser.newContext({acceptDownloads:true});
    await ec.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const ep=await ec.newPage();ep.on('pageerror',e=>errors.push('editor: '+e.message));
    await ep.goto(origin+'/');await ep.waitForFunction(()=>!!window.HmvReviewUI);
    const doc=domain.normalizeDocument(fixture);
    await ep.evaluate(async d=>{await(await HmvReviewStorage.open()).put('documents',d);},doc);
    await ep.evaluate(()=>HmvReviewUI.open());await ep.locator(`[data-rv-open="${doc.id}"]`).click();
    assert.equal(await ep.locator('#rv-attempt-limit').inputValue(),'2');
    await ep.locator('#rv-save').click();await ep.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));
    const saved=await ep.evaluate(async id=>(await(await HmvReviewStorage.open()).get('documents',id)),doc.id);
    assert.equal(saved.questions.length,8);assert.deepEqual(saved.questions.map(q=>q.type),fixture.questions.map(q=>q.type));
    assert.equal(saved.questions[7].metadata.answerLayout,'grid-calculation');
    const wait=ep.waitForEvent('download');await ep.locator('#rv-export-html').click();const dl=await wait;
    exported=path.join(output,'toan-4-de-tong-hop.html');await dl.saveAs(exported);await ec.close();
    const src=fs.readFileSync(exported,'utf8');
    assert.doesNotMatch(src,/<script[^>]+src=|<link[^>]+href=/i);assert.doesNotMatch(src,/Lời giải đúng: 1 điểm|Đặt thẳng hàng: 1 điểm/);
    pass('editor-save-export','8 dạng câu lưu đúng thứ tự/kiểu; HTML xuất từ trình biên tập, tự chứa, không có hướng dẫn chấm tự luận');
    // 2. Học sinh: điện thoại 390px, offline
    const ctx=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:900},hasTouch:true,isMobile:true});
    const p=await ctx.newPage();p.setDefaultTimeout(10000);
    p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    await p.goto(pathToFileURL(exported).href);
    assert.equal(await p.locator('fieldset.question-card').count(),8);
    await answerPartial(p);
    await cell(p,0,3).fill('4625');await cell(p,1,3).fill('2378');
    const draftGrid=(await read(p)).attempt.answers.grid;
    await p.reload();
    assert.equal(await p.locator('input[name=q0][value="0"]').isChecked(),true);
    assert.equal(await p.locator('input[name=q1s1][value=true]').isChecked(),true);
    assert.equal(await p.locator('[name=q3b2]').inputValue(),'30');
    assert.match(await p.locator('[name=q6]').inputValue(),/Đáp số: 775 kg/);
    assert.equal(await p.locator('[name=q5]').inputValue(),'100 000');
    assert.deepEqual((await read(p)).attempt.answers.grid,draftGrid);
    assert.deepEqual((await read(p)).attempt.answers.match,[1,0,2]);
    assert.equal((await read(p)).submissions.length,0);
    pass('H-draft','nháp 8 dạng (cả nối cặp, vở ô li) khôi phục sau tải lại; chưa trừ lượt');
    await p.screenshot({path:path.join(output,'390-nhap.png'),fullPage:true});
    p.once('dialog',d=>d.accept());await p.locator('#submit').click();
    await p.waitForFunction(()=>document.querySelector('#result').textContent.length>0);
    const r1=await p.locator('#result').textContent();
    let st=await read(p);const s1=st.submissions[0];
    assert.equal(st.submissions.length,1);assert.equal(s1.score,null);assert.equal(s1.pendingManual,2);
    const pts=Object.fromEntries(s1.results.map(r=>[r.questionId,r.points]));
    assert.deepEqual(pts,{single:0,tf:2/3,multi:0,fill:2/3,match:1/3,short:1,essay:null,grid:null});
    assert.doesNotMatch(r1,/\/ 10 điểm/);assert.match(r1,/Chưa có điểm tổng chính thức/);
    console.log('  result#1: '+r1.replace(/\s+/g,' ').trim());
    pass('A-B-C-D','từng dạng chấm đúng; điểm phần lưu chính xác 2/3, 1/3; chưa có điểm tổng giả khi còn 2 câu chờ chấm');
    // G: answerVisibility=after-attempts, mới 1/2 lượt -> chưa thấy lời giải/đáp án
    assert.equal(await p.locator('.wrong-explanation').count(),0);
    const body1=await p.locator('body').innerText();
    for(const t of ['1 tấn = 1 000 kg.','Số có chữ số tận cùng là 0 hoặc 5','Lời giải đúng: 1 điểm'])assert.ok(!body1.includes(t),'lộ: '+t);
    assert.equal(await p.locator('#retry').isVisible(),true);
    pass('F-G','điểm hiển thị ngay; lời giải/đáp án ẩn trên giao diện khi chưa hết lượt');
    await p.screenshot({path:path.join(output,'390-ket-qua-luot-1.png'),fullPage:true});
    await p.reload();st=await read(p);assert.equal(st.submissions.length,1);assert.deepEqual(st.submissions[0],s1);
    assert.equal(await p.locator('[name=q6]').isDisabled(),true);
    // 3. Làm lại lượt 2 (cuối)
    await Promise.all([p.waitForEvent('load'),p.locator('#retry').click()]);
    assert.equal(await p.locator('input[name=q0]:checked').count(),0);
    await answerFull(p);await cell(p,0,3).fill('4625');await cell(p,1,3).fill('2378');await cell(p,3,3).fill('7003');
    p.once('dialog',d=>d.accept());await p.locator('#submit').click();
    await p.waitForFunction(()=>(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('hmv-practice-v1-'))))?.submissions||[]).length===2);
    st=await read(p);const s2=st.submissions[1];
    assert.deepEqual(st.submissions[0],s1);assert.notEqual(s2.id,s1.id);
    assert.deepEqual(Object.fromEntries(s2.results.map(r=>[r.questionId,r.points])),{single:0,tf:1,multi:1,fill:1,match:1,short:1,essay:null,grid:null});
    assert.equal(s2.score,null);
    const r2=await p.locator('#result').textContent();console.log('  result#2: '+r2.replace(/\s+/g,' ').trim());
    assert.match(r2,/Chưa có điểm tổng chính thức/);
    assert.equal(await p.locator('#retry').isHidden(),true);assert.match(await p.locator('#attempt-limit-status').textContent(),/hết lượt/);
    pass('E','2 lượt lưu riêng; lượt 1 không bị ghi đè; hết lượt khóa Làm lại');
    await p.reload();assert.equal((await read(p)).submissions.length,2);assert.equal(await p.locator('#retry').isHidden(),true);
    const body2=await p.locator('body').innerText();
    assert.ok(!body2.includes('Lời giải đúng: 1 điểm')&&!body2.includes('Đặt thẳng hàng: 1 điểm'),'lộ hướng dẫn chấm tự luận');
    assert.equal(await p.locator('.wrong-explanation').count(),1);
    await p.locator('.wrong-explanation summary').click();
    assert.match(await p.locator('.wrong-explanation').innerText(),/làm tròn lên 46 000/);
    pass('G-after','hết lượt: chỉ câu sai có nút "Vì sao em sai?" và lời giải mở được; vẫn không lộ hướng dẫn chấm tự luận');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await p.screenshot({path:path.join(output,'390-ket-qua-luot-2.png'),fullPage:true});
    await ctx.close();
    // Máy tính 1366px
    const dc=await browser.newContext({offline:true,viewport:{width:1366,height:900}});const dp=await dc.newPage();dp.on('pageerror',e=>errors.push(e.message));
    await dp.goto(pathToFileURL(exported).href);assert.equal(await dp.locator('fieldset.question-card').count(),8);
    assert.equal(await dp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await dp.screenshot({path:path.join(output,'1366-de.png'),fullPage:true});await dc.close();
    // Hồi quy: trình xem chặn hộp thoại (iframe sandbox không có allow-modals, như trình xem link trên điện thoại) vẫn nộp được bằng xác nhận trên trang.
    const page=fs.readFileSync(exported);
    const hs=http.createServer((req,res)=>{if(req.url==='/de.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);}else{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<iframe id="f" src="/de.html" sandbox="allow-scripts allow-same-origin allow-forms" style="width:390px;height:900px"></iframe>');}});
    await new Promise(r=>hs.listen(0,'127.0.0.1',r));
    const sc=await browser.newContext({viewport:{width:390,height:900}});const sp=await sc.newPage();
    await sp.goto('http://127.0.0.1:'+hs.address().port+'/');
    const fr=sp.frameLocator('#f');await fr.locator('#submit').waitFor();
    await fr.locator('input[name=q0][value="1"]').check();
    await fr.locator('#submit').click();
    assert.equal(await fr.locator('#submit').textContent(),'Xác nhận nộp bài');
    assert.match(await fr.locator('.submit-panel p').textContent(),/Còn 7 câu chưa trả lời/);
    assert.equal(await fr.locator('#result').textContent(),'');
    await fr.locator('input[name=q5]').fill('100000');
    assert.equal(await fr.locator('#submit').textContent(),'Nộp bài');
    await fr.locator('#submit').click();await fr.locator('#submit').click();
    assert.match(await fr.locator('#result').textContent(),/Đã chấm: 2 \/ 6 điểm/);
    await sc.close();await new Promise(r=>hs.close(r));
    pass('sandbox-submit','hộp thoại bị chặn: hiện "Xác nhận nộp bài" trên trang, sửa bài thì hủy xác nhận, bấm lần 2 nộp được');
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    pass('I','file:// offline, 0 yêu cầu mạng, 0 lỗi JS; 390px và 1366px không tràn ngang');
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({rows,errors,network},null,2));
  }finally{await new Promise(r=>server.close(r));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
