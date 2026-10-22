'use strict';
// AI phân tích đề + xuất Word – kiểm thử trình duyệt trên ứng dụng thật, AI GIẢ LẬP tại /api/ai/generate (không gọi Gemini).
// Chạy: HMV_EVIDENCE_DIR=<thư mục> node kiem-thu/review-ai-word-browser.cjs   (tùy chọn HMV_TEST_PDF=<đường dẫn PDF mẫu>)
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR||path.join(__dirname,'..','..','bang-chung-ai-word')),app=path.resolve(__dirname,'../app');
const rows=[];const pass=(id,t)=>{rows.push({id,status:'PASS',t});console.log(id+' PASS '+t);};
const AI={title:'Đề kiểm tra giữa học kì I',subject:'Toán',grade:4,topic:'Kiểm tra giữa học kì I',passages:[],
 questions:[
  {number:'1',type:'ABCD',text:'Số “hai triệu bốn trăm linh năm nghìn không trăm mười tám” được viết là:',points:0.5,options:['2 450 018','2 405 018','2 405 180','2 045 018'],correct:[1],answerSource:'key',section:'PHẦN I: TRẮC NGHIỆM (1,5 điểm)',sectionNote:'Khoanh vào chữ (A, B, C hoặc D) đặt trước ý đúng.'},
  {number:'2',type:'ABCD',text:'Góc có số đo 120° là:',points:0.5,options:['Góc nhọn','Góc tù','Góc vuông','Góc bẹt'],correct:[1],answerSource:'ai',section:'PHẦN I: TRẮC NGHIỆM (1,5 điểm)'},
  {number:'3',type:'TRUEFALSE',text:'Đúng ghi Đ, sai ghi S:',points:0.5,statements:[{text:'1 tấn = 1 000 kg',answer:'Đúng'},{text:'1 giờ = 100 phút',answer:'Sai'}],answerSource:'key',section:'PHẦN I: TRẮC NGHIỆM (1,5 điểm)'},
  {number:'4',type:'OPEN',text:'Dùng thước đo góc để đo các góc dưới đây, rồi viết số đo vào chỗ chấm.',points:1,answerSource:'none',needsFigure:true,figureNote:'hai góc đỉnh O và đỉnh I',section:'PHẦN II: TỰ LUẬN (3,5 điểm)'},
  {number:'5a',type:'OPEN',text:'Đặt tính rồi tính: 243 625 + 132 284',points:0.5,layout:'grid-calculation',answerText:'375 909',answerSource:'key',section:'PHẦN II: TỰ LUẬN (3,5 điểm)'},
  {number:'5b',type:'OPEN',text:'Đặt tính rồi tính: 586 742 − 243 561',points:0.5,layout:'grid-calculation',answerText:'343 181',answerSource:'key',section:'PHẦN II: TỰ LUẬN (3,5 điểm)'},
  {number:'6',type:'FILL',text:'2 giờ = [[1]] phút',points:0.5,blanks:[{answer:''}],answerSource:'none',section:'PHẦN II: TỰ LUẬN (3,5 điểm)'},
  {number:'7',type:'OPEN',text:'Em mua 3 quyển vở, mỗi quyển giá 7 000 đồng. Hỏi em phải trả bao nhiêu tiền?',points:1,answerText:'21 000 đồng',guide:'Lời giải đúng 0,5 điểm; phép tính đúng 0,5 điểm.',answerSource:'key',section:'PHẦN II: TỰ LUẬN (3,5 điểm)'}
 ],warnings:['Câu 4 có hình vẽ, AI không chép được hình.']};

async function main(){
  fs.mkdirSync(output,{recursive:true});
  let mode='ok';const calls=[];
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://x');
    if(u.pathname==='/api/ai/generate'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{const body=JSON.parse(b);calls.push(body);
      if(mode==='nokey'){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:false,code:'NO_KEY',message:'Chưa có khóa Gemini.'}));}
      const solve=body.schema&&body.schema.properties&&body.schema.properties.answers;
      const items=solve?JSON.parse(body.contents[0].parts[0].text.replace(/^[\s\S]*?Giải các câu sau:\n/,'')):null;
      const answers=solve?items.map(q=>q.type==='FILL'?{id:q.id,blanks:['120']}:{id:q.id,answerText:'Góc đỉnh O: 60°; góc đỉnh I: 120°',guide:'Mỗi số đo đúng 0,5 điểm.'}):null;
      res.writeHead(200,{'Content-Type':'application/json'});setTimeout(()=>res.end(JSON.stringify({ok:true,text:JSON.stringify(solve?{answers}:AI),model:'gemini-gia-lap'})),300);});return;}
    if(u.pathname==='/api/ai/status'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,server:2,configured:mode!=='nokey-status'}));}
    if(u.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});return res.end('{"ok":false}');}
    const t=path.resolve(app,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!t.startsWith(app+path.sep)){res.writeHead(403);return res.end();}
    fs.readFile(t,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(t)]||'application/octet-stream'});res.end(e?'':d);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH||undefined});const errors=[];
  try{
    const c=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
    await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
    await p.goto(origin+'/');await p.waitForFunction(()=>!!window.HmvReviewUI&&!!window.HmvReviewAi&&!!window.HmvReviewWord);
    await p.evaluate(()=>HmvReviewUI.open());await p.locator('#rv-import').waitFor({state:'attached'});
    await p.waitForFunction(()=>document.querySelector('#rv-use-ai')?.checked===true);
    assert.match(await p.locator('#rv-drop').textContent(),/AI làm hết, kể cả đáp án/);
    pass('ai-options','khung tải đề: "Dùng AI đọc đề" tự bật khi đã có khóa Gemini; ghi rõ AI làm hết, thầy cô chỉ xem lướt và sửa');

    // 1) Word của trường → AI
    await p.locator('#rv-import').setInputFiles(path.join(__dirname,'files/de-toan-ghk1-mau-truong.docx'));
    await p.locator('#rv-ai-report').waitFor();
    assert.equal(calls.length,2,'lượt 1 đọc đề, lượt 2 giải các câu còn thiếu đáp án');const sent=calls[0];
    assert.equal(sent.json,true);assert.match(sent.system,/BẮT BUỘC có đáp án cho MỌI câu/);assert.match(sent.contents[0].parts[0].text,/Câu 1/);assert.ok(!sent.contents[0].parts.some(x=>x.inlineData),'Word gửi chữ, không gửi tệp');
    const second=JSON.parse(calls[1].contents[0].parts[0].text.replace(/^[\s\S]*?Giải các câu sau:\n/,''));assert.deepEqual(second.map(q=>q.id).sort(),['cau-4','cau-6'],'chỉ gửi lại các câu chưa có đáp án');
    assert.equal(await p.locator('[data-question]').count(),8);
    assert.equal(await p.locator('#rv-edit-subject').inputValue(),'Toán');
    const report=await p.locator('#rv-ai-report').textContent();
    assert.match(report,/AI đã làm xong/);assert.match(report,/8 câu/);assert.match(report,/5 điểm/);assert.match(report,/3 câu đề không có đáp án nên AI tự giải \(Câu 2, 4, 7,/);assert.match(report,/cần hình vẽ/);assert.doesNotMatch(report,/chưa có đáp án/i);
    assert.match(await p.locator('[data-question="1"] legend').textContent(),/✨ AI giải/);assert.match(await p.locator('[data-question="1"]').textContent(),/Đáp án: B\. Góc tù/);
    assert.match(await p.locator('[data-question="0"]').textContent(),/Đáp án: B\. 2 405 018/);
    assert.equal(await p.locator('[data-question="6"] [data-blank-key]').inputValue(),'120');assert.match(await p.locator('[data-question="6"] legend').textContent(),/✨ AI giải/);
    assert.match(await p.locator('[data-question="3"] [data-q="answerText"]').inputValue(),/60°/);assert.match(await p.locator('[data-question="3"] legend').textContent(),/Cần hình vẽ/);
    assert.equal(await p.locator('.rv-ai-ok, #rv-ai-approve-all').count(),0,'không còn nút duyệt');
    assert.match(await p.locator('#rv-message').textContent(),/AI đã làm xong 8 câu.*3 câu AI tự giải/);
    await p.screenshot({path:path.join(output,'1-ket-qua-ai.png'),fullPage:false});
    await p.locator('#rv-ai-report').screenshot({path:path.join(output,'1b-bang-tom-tat.png')});
    pass('ai-docx','nhập Word → AI đọc 8 câu, tự giải đủ 3 câu thiếu đáp án (lượt 2 chỉ gửi câu thiếu), hiện đáp án ngay dưới tiêu đề câu, không còn bước duyệt');
    await p.locator('[data-question="1"] [data-key="2"]').check();
    await p.locator('#rv-save').click();await p.waitForFunction(()=>/Đã lưu bản nháp/.test(document.querySelector('#rv-message').textContent));
    assert.match(await p.locator('[data-question="1"]').textContent(),/Đáp án: C\. Góc vuông/);
    pass('ai-edit','thầy cô sửa đáp án trong ô rồi Lưu bản nháp là xong, đáp án hiển thị cập nhật theo');

    // 2) Xuất Word
    const w=p.waitForEvent('download');await p.locator('#rv-export-word').click();const d=await w;
    assert.match(d.suggestedFilename(),/\.docx$/);const docx=path.join(output,'de-xuat-gon.docx');await d.saveAs(docx);
    const buf=fs.readFileSync(docx);assert.equal(buf.slice(0,2).toString(),'PK');
    const xml=buf.toString('utf8');assert.match(xml,/KTĐK GIỮA HKI - NĂM HỌC/);assert.match(xml,/MÔN TOÁN - Lớp 4/);assert.match(xml,/Thời gian : 40 phút/);assert.match(xml,/PHẦN BÀI LÀM CỦA HỌC SINH/);
    assert.match(xml,/PHẦN I: TRẮC NGHIỆM/);assert.match(xml,/…\/0,5 đ/);assert.match(xml,/Đặt tính rồi tính:/);assert.match(xml,/ĐÁP ÁN MÔN TOÁN – GIỮA HKI – LỚP 4/);assert.match(xml,/Hình vẽ: hai góc đỉnh O và đỉnh I/);
    assert.doesNotMatch(xml,/Lớp 4[./]\d/,'không ghi lớp cụ thể');
    await p.locator('#rv-word-layout').selectOption('roomy');await p.locator('#rv-word-minutes').fill('35');
    const w2=p.waitForEvent('download');await p.locator('#rv-export-word').click();const d2=await w2;assert.match(d2.suggestedFilename(),/-thoang\.docx$/);
    const docx2=path.join(output,'de-xuat-thoang.docx');await d2.saveAs(docx2);assert.match(fs.readFileSync(docx2,'utf8'),/Thời gian : 35 phút/);
    pass('word','xuất Word gọn và thoáng: khung tiêu đề trường, môn/lớp 4, thời gian, cột điểm, phần I/II, đặt tính gộp, hướng dẫn chấm, chỗ chèn hình');

    // 3) HTML và SCORM vẫn chạy
    const w3=p.waitForEvent('download');await p.locator('#rv-export-html').click();const f3=path.join(output,'de.html');await (await w3).saveAs(f3);assert.match(fs.readFileSync(f3,'utf8'),/<!doctype html>/i);
    const w4=p.waitForEvent('download');await p.locator('#rv-export-scorm').click();assert.match((await w4).suggestedFilename(),/\.zip$/);
    pass('html-scorm','đề do AI tách xuất HTML tương tác và gói SCORM như cũ');

    // 4) AI lỗi → nhập thường
    mode='nokey';await p.locator('#rv-library').click();await p.locator('#rv-import').waitFor({state:'attached'});await p.waitForFunction(()=>document.querySelector('#rv-use-ai')?.checked===true);
    await p.locator('#rv-import').setInputFiles(path.join(__dirname,'files/de-toan-ghk1-mau-truong.docx'));
    await p.waitForFunction(()=>/AI chưa đọc được/.test(document.querySelector('#rv-message')?.textContent||''));
    assert.match(await p.locator('#rv-message').textContent(),/Chưa có khóa Gemini/);
    assert.equal(await p.locator('[data-question]').count(),15,'quay về bộ đọc mẫu đề trường');
    pass('ai-fallback','chưa có khóa AI: báo rõ lý do và vẫn nhập theo cách cũ (15 câu)');

    // 5) Tắt AI → không gọi AI
    mode='ok';const before=calls.length;await p.locator('#rv-library').click();await p.waitForFunction(()=>document.querySelector('#rv-use-ai')?.checked===true);await p.locator('#rv-use-ai').uncheck();
    await p.locator('#rv-import').setInputFiles(path.join(__dirname,'files/de-toan-ghk1-mau-truong.docx'));await p.locator('[data-question]').first().waitFor();
    assert.equal(calls.length,before);await p.locator('#rv-library').click();await p.waitForFunction(()=>document.querySelector('#rv-use-ai')?.checked===true);
    pass('ai-off','bỏ chọn AI thì không gửi gì cho AI, đọc theo mẫu đề trường');

    // 6) PDF gửi nguyên tệp + bật gợi ý đáp án + phân tích lại
    if(process.env.HMV_TEST_PDF&&fs.existsSync(process.env.HMV_TEST_PDF)){
      await p.locator('#rv-import').setInputFiles(process.env.HMV_TEST_PDF);await p.locator('#rv-ai-report').waitFor();
      const last=calls.filter(c=>!(c.schema&&c.schema.properties.answers)).pop();assert.equal(last.contents[0].parts[0].inlineData.mimeType,'application/pdf');
      const n=calls.length;await p.locator('#rv-ai-reanalyze').click();await p.waitForFunction(()=>/AI đã đọc lại/.test(document.querySelector('#rv-message').textContent));assert.ok(calls.length>=n+1);
      pass('ai-pdf','PDF gửi nguyên tệp cho AI (đọc được cả bản scan); nút "AI đọc lại đề" chạy');
    }
    assert.deepEqual(errors,[]);pass('no-errors','không có lỗi JavaScript');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
  fs.writeFileSync(path.join(output,'ket-qua.json'),JSON.stringify(rows,null,2));console.log('XONG '+rows.length+' mục PASS · '+output);
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
