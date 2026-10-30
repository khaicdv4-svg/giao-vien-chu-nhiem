'use strict';
// Kiểm thử "Nguồn bài học" trong Trợ lý AI > Tạo câu hỏi nhanh: thêm file Word/PDF (30/10/2026).
// AI được giả lập ở ./api/ai/*, không gọi Gemini thật. Chạy: node HOC-MA-VUI-BAN-CHINH/kiem-thu/nguon-file-tro-ly.cjs
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const APP=path.join(__dirname,'../app'),FILES=path.join(__dirname,'files-nguon');
const evidence=process.env.HMV_EVIDENCE_DIR||path.join(__dirname,'..','bang-chung-nguon-file-20261030');
const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\..+/,'');
let pass=0;const failed=[];
async function check(name,fn){try{await fn();pass++;console.log('✓ '+name);}catch(e){failed.push(name);console.log('✗ '+name+' — '+(e&&e.message||e));}}
const type=p=>p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.json')||p.endsWith('.webmanifest')?'application/json':'application/octet-stream';
(async()=>{
  const bodies=[];
  const srv=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p==='/')p='/index.html';
    if(p==='/api/ai/status'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,server:true,configured:true,provider:'gemini',model:'gia-lap'}));}
    if(p==='/api/ai/generate'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{bodies.push(JSON.parse(b));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,model:'gia-lap',text:JSON.stringify({questions:[{text:'Số 345 678 có chữ số 4 ở hàng nào?',kind:'ABCD',answers:['Chục nghìn','Nghìn','Trăm nghìn','Trăm'],correct:0,answerText:'',explanation:'Chữ số 4 đứng ở hàng chục nghìn.',level:'Mức 1'}]})}));});return;}
    if(p.startsWith('/api/')){res.writeHead(404);return res.end('{}');}
    const f=path.join(APP,p);if(!f.startsWith(APP)){res.writeHead(403);return res.end();}
    fs.readFile(f,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':type(p)});res.end(e?'':d);});});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';
  fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({headless:true});const external=[],errors=[];
  try{
    for(const width of [1280,390]){
      bodies.length=0;
      const ctx=await browser.newContext({viewport:{width,height:900}});
      await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1'){external.push(u.href);return r.abort();}return r.continue();});
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(width+': '+e.message));
      await page.goto(base+'index.html');
      await page.waitForFunction(()=>!!window.hmvTroLyAI,null,{timeout:20000});
      await page.evaluate(()=>window.hmvTroLyAI.open('quick'));await page.waitForSelector('#taDocs',{state:'attached'});
      await check(width+': khung Nguồn bài học có nút “Thêm file Word/PDF”',async()=>{assert.match(await page.locator('label:has(#taDocs)').textContent(),/Thêm file Word\/PDF/);});
      await check(width+': file Word: chữ được chép vào ô Nguồn bài học',async()=>{
        await page.setInputFiles('#taDocs',path.join(FILES,'bai-hoc-mau.docx'));
        await page.waitForFunction(()=>/\[Từ file bai-hoc-mau\.docx\]/.test(document.getElementById('taSource').value),null,{timeout:15000});
        const v=await page.inputValue('#taSource');assert.match(v,/345 678 gồm 3 trăm nghìn/);assert.match(await page.locator('#taNote').textContent(),/Đã chép/);
      });
      const reader=await page.evaluate(()=>!!(window.HmvReviewImport&&window.HmvReviewImport.readFile));
      await check(width+(reader?': file PDF có chữ: chữ được chép tiếp vào ô Nguồn, không xóa phần cũ':': bản này chưa có bộ đọc PDF: file PDF được gửi nguyên cho AI, ô Nguồn giữ nguyên'),async()=>{
        await page.setInputFiles('#taDocs',path.join(FILES,'bai-hoc-chu.pdf'));
        if(reader){await page.waitForFunction(()=>/\[Từ file bai-hoc-chu\.pdf\]/.test(document.getElementById('taSource').value),null,{timeout:20000});const v=await page.inputValue('#taSource');assert.match(v,/Hang va lop/);assert.match(v,/345 678/);}
        else{await page.waitForSelector('.ta-thumb.ta-doc',{timeout:20000});assert.match(await page.locator('.ta-doc').textContent(),/bai-hoc-chu\.pdf/);assert.match(await page.inputValue('#taSource'),/345 678/);}
      });
      await check(width+': PDF scan (không có chữ): hiện thẻ file, gửi nguyên file cho AI',async()=>{
        await page.setInputFiles('#taDocs',path.join(FILES,'trang-sach-scan.pdf'));
        await page.waitForFunction(n=>document.querySelectorAll('.ta-thumb.ta-doc').length===n,reader?1:2,{timeout:20000});assert.match(await page.locator('#taThumbs').textContent(),/trang-sach-scan\.pdf/);
      });
      await check(width+': file .doc đời cũ bị từ chối, không làm hỏng nguồn',async()=>{
        const before=await page.inputValue('#taSource');await page.setInputFiles('#taDocs',path.join(FILES,'de-cu.doc'));await page.waitForTimeout(500);
        assert.equal(await page.inputValue('#taSource'),before);assert.equal(await page.locator('.ta-thumb.ta-doc').count(),reader?1:2);
      });
      if(width===390)await check('390: không tràn ngang',async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));});
      await page.locator('#taSource').scrollIntoViewIfNeeded();
      await page.locator('#troLyAI').screenshot({path:path.join(evidence,`nguon-file-${width}-${stamp}.png`)});
      await check(width+': Tạo câu hỏi gửi cho AI cả chữ từ file Word/PDF và file PDF scan',async()=>{
        await page.click('#taGenerate');await page.waitForFunction(()=>window.hmvTroLyAI.state().drafts>0,null,{timeout:20000});
        const b=bodies[0];const txt=b.contents[0].parts[0].text;
        assert.match(txt,/NGUỒN BÀI HỌC/);assert.match(txt,/345 678 gồm/);if(reader)assert.match(txt,/Hang va lop/);
        assert.equal(b.contents[0].parts.filter(p=>p.inlineData&&p.inlineData.mimeType==='application/pdf').length,reader?1:2);
      });
      await check(width+': bỏ thẻ PDF scan thì lần tạo sau không gửi file nữa',async()=>{
        const n0=await page.locator('.ta-thumb.ta-doc').count();await page.click('[data-ta-pdf-del="0"]');assert.equal(await page.locator('.ta-thumb.ta-doc').count(),n0-1);
      });
      await ctx.close();
    }
    await check('Không có yêu cầu mạng ra ngoài',()=>assert.deepEqual(external,[]));
    await check('Không có lỗi JavaScript',()=>assert.deepEqual(errors,[]));
  }finally{await browser.close();srv.close();}
  console.log(`\n${pass}/${pass+failed.length} PASS`+(failed.length?' — lỗi: '+failed.join(' | '):''));
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
