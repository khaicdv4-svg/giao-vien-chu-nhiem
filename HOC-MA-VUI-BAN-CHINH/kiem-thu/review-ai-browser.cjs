'use strict';
// Đọc đề bằng AI: chọn PDF → app gửi PDF qua ./api/ai/generate (giả lập Gemini) → nhận JSON → làm sạch → trình soạn → xuất HTML có bài đọc.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR||'/tmp/hmv-ai-evidence'),app=path.resolve(__dirname,'../app');
const AI={title:'Đề ôn Tiếng Việt và Toán',subject:'Tiếng Việt',topic:'Giữa học kì I',
 blocks:[{id:'bai-doc-1',title:'Cánh đồng',text:'Buổi sáng, cánh đồng lúa chín vàng.',sourceNote:'Theo Tác giả A'}],
 questions:[
  {type:'ABCD',text:'Câu 1. Cánh đồng có màu gì?',options:['A. Xanh','B. Vàng','C. Đỏ','D. Tím'],correctAnswers:[1],points:0.5,explanation:'Bài đọc tả lúa chín vàng.',blockIds:['bai-doc-1'],fromKey:true},
  {type:'TRUEFALSE',text:'Đúng ghi Đ, sai ghi S.',statements:[{text:'1 tấn = 1 000 kg',answer:true},{text:'1 m = 10 cm',answer:'S'}],points:'1',fromKey:true},
  {type:'FILL',text:'2 giờ = [[1]] phút',blanks:[{id:'1',answerText:'120'}],points:0.5},
  {type:'SHORT',text:'Số liền sau của 99 999 là:',answerText:'100 000',acceptedAnswers:['100000'],points:0.5,fromKey:false},
  {type:'MATCHING',text:'Nối phép tính với kết quả.',pairs:[{left:'25 × 4',right:'100'},{left:'72 : 8',right:'9'}],points:1},
  {type:'OPEN',text:'Đặt tính rồi tính: 4685 : 5',answerLayout:'grid-calculation',explanation:'937',points:0.5},
  {type:'OPEN',text:'Đo góc đỉnh O. [Hình: góc nhọn]',answerLayout:'plain',answerText:'60°',points:1,needsImage:true},
  {type:'ABCD',text:'Câu lỗi',options:['x'],correctAnswers:[0]}
 ]};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const server=http.createServer((req,res)=>{const t=path.resolve(app,'.'+new URL(req.url,'http://x').pathname.replace(/^\/$/,'/index.html'));if(!t.startsWith(app+path.sep)){res.writeHead(403);return res.end();}fs.readFile(t,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(t)]||'application/octet-stream'});res.end(e?'':d);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});const errors=[];let sent=null;
  try{
    const c=await browser.newContext({acceptDownloads:true});
    await c.route('**/*',r=>{const u=r.request().url();if(u===origin+'/api/ai/generate'){sent=JSON.parse(r.request().postData());return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,model:'gemini-3.8-flash',text:'```json\n'+JSON.stringify(AI)+'\n```'})});}return u.startsWith(origin+'/')?r.continue():r.abort();});
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForFunction(()=>!!window.HmvReviewUI&&!!window.HmvReviewAI);
    await p.evaluate(()=>HmvReviewUI.open());
    await p.waitForSelector('#rv-drop');assert.equal(await p.locator('#rv-drop input[type=file]').count(),1,'chỉ còn một nút chọn file đề');
    assert.equal(await p.locator('#rv-use-ai').isChecked(),false,'chưa có khóa thì không tự bật AI');assert.match(await p.locator('#rv-ai-hint').textContent(),/Kết nối AI/);
    await p.screenshot({path:path.join(output,'kho-tai-de.png'),fullPage:true});
    await p.locator('#rv-use-ai').check();
    await p.locator('#rv-import').setInputFiles({name:'de-on-tap.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 thu')});
    await p.waitForSelector('#rv-export-scorm');
    const part=sent.contents[0].parts[0];assert.equal(part.inlineData.mimeType,'application/pdf');assert.equal(Buffer.from(part.inlineData.data,'base64').toString(),'%PDF-1.4 thu');
    assert.equal(sent.json,true);assert.match(sent.system,/grid-calculation/);
    assert.equal(await p.locator('[data-question]').count(),7,'câu lỗi bị bỏ, còn 7 câu');
    const msg=await p.locator('#rv-message').textContent();
    assert.match(msg,/đọc được 7 câu/);assert.match(msg,/tự giải đáp án câu 4/);assert.match(msg,/Câu 7 cần hình/);assert.match(msg,/1 câu AI trả về thiếu dữ liệu/);
    assert.equal(await p.locator('#rv-edit-subject').inputValue(),'Tiếng Việt');
    const w=p.waitForEvent('download');await p.locator('#rv-export-html').click();const d=await w;const f=path.join(output,'de-ai.html');await d.saveAs(f);
    const out=fs.readFileSync(f,'utf8');const data=JSON.parse(out.match(/\(function runtime[\s\S]*?\}\)\((\{[\s\S]*\})\);<\/script>/)[1].replace(/\\u003c/g,'<'));
    assert.equal(data.questions.length,7);assert.equal(data.questions[0].text,'Cánh đồng có màu gì?');assert.deepEqual(data.questions[0].options,['Xanh','Vàng','Đỏ','Tím']);
    assert.equal(data.readingBlocks.length,1);assert.match(out,/Theo Tác giả A/);
    assert.equal(data.questions[5].answerLayout,'grid-calculation');assert.equal(data.questions.reduce((n,q)=>n+q.points,0),5);
    await p.screenshot({path:path.join(output,'doc-de-ai.png'),fullPage:false});
    console.log('PASS Đọc đề bằng AI: gửi PDF dạng inlineData, nhận JSON có ```, bỏ câu lỗi, cảnh báo câu AI tự giải và câu cần hình, xuất HTML có bài đọc');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
