'use strict';
// Kiểm thử gọi Gemini trên bản web (30/10/2026): mức suy nghĩ "low" khi soạn câu hỏi, chừa thời gian cho model dự phòng,
// và Gemini báo lỗi 400 thì thử lại không kèm lược đồ/mức suy nghĩ. Gemini GIẢ: chặn generativelanguage.googleapis.com, không gọi thật.
// Chạy: node HOC-MA-VUI-BAN-CHINH/kiem-thu/ai-web-thoi-gian.cjs
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const APP=path.join(__dirname,'../app');
let pass=0;const failed=[];async function check(n,f){try{await f();pass++;console.log('✓ '+n);}catch(e){failed.push(n);console.log('✗ '+n+' — '+e.message);}}
(async()=>{
  const srv=http.createServer((q,r)=>{const p=new URL(q.url,'http://x').pathname;if(p==='/'){r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return r.end('<!doctype html><meta charset=utf-8><body><script src="ai-tren-web.js"></script></body>');}
    fs.readFile(path.join(APP,path.basename(p)),(e,d)=>{r.writeHead(e?404:200,{'Content-Type':'text/javascript'});r.end(e?'':d);});});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
  const browser=await chromium.launch({args:['--host-resolver-rules=MAP hocmavui.test 127.0.0.1']});
  const ctx=await browser.newContext();const calls=[];let mode='ok';
  await ctx.route('https://generativelanguage.googleapis.com/**',async r=>{const u=new URL(r.request().url());const model=decodeURIComponent(u.pathname.split('/models/')[1]).replace(':generateContent','');const body=JSON.parse(r.request().postData());calls.push({model,cfg:body.generationConfig,at:Date.now()});
    const ok=()=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({candidates:[{content:{parts:[{text:'{"questions":[]}'}]},finishReason:'STOP'}]})});
    if(mode==='hang'&&calls.length===1)return; // model đầu không trả lời
    if(mode==='bad-thinking'&&body.generationConfig.thinkingConfig)return r.fulfill({status:400,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message:'thinking_level is not supported'}})});
    return ok();});
  const page=await ctx.newPage();await page.goto('http://hocmavui.test:'+port+'/');
  await page.evaluate(()=>localStorage.setItem('hmv_gemini_web_v1',JSON.stringify({key:'AIzaSyTEST-nguoi-dung-A-0000000000AAAA',model:''})));
  const gen=(extra)=>page.evaluate(b=>window.hmvAiFetch('./api/ai/generate',{method:'POST',body:JSON.stringify(b)}).then(r=>r.json()),Object.assign({contents:[{role:'user',parts:[{text:'Soạn 5 câu'}]}],json:true,schema:{type:'OBJECT',properties:{questions:{type:'ARRAY',items:{type:'STRING'}}}},timeoutMs:20000},extra));
  await check('Soạn câu hỏi gửi thinkingLevel "low" cho Gemini',async()=>{calls.length=0;mode='ok';const r=await gen({thinking:'low'});assert.equal(r.ok,true);assert.equal(calls[0].cfg.thinkingConfig.thinkingLevel,'low');});
  await check('Không yêu cầu mức suy nghĩ thì không gửi thinkingConfig (giữ như cũ)',async()=>{calls.length=0;const r=await gen({});assert.equal(r.ok,true);assert.equal(calls[0].cfg.thinkingConfig,undefined);});
  await check('Model đầu treo: chuyển sang model dự phòng kịp trong thời gian chờ',async()=>{calls.length=0;mode='hang';const t0=Date.now();const r=await gen({thinking:'low'});const dt=Date.now()-t0;assert.equal(r.ok,true,JSON.stringify(r));assert.equal(calls.length,2);assert.notEqual(calls[0].model,calls[1].model);assert.ok(dt<20000+2000,'quá giờ: '+dt);console.log('   (model dự phòng chạy sau '+Math.round((calls[1].at-calls[0].at)/1000)+' giây, tổng '+Math.round(dt/1000)+' giây)');});
  await check('Gemini báo 400 vì mức suy nghĩ: tự thử lại không kèm, vẫn ra kết quả',async()=>{calls.length=0;mode='bad-thinking';const r=await gen({thinking:'low'});assert.equal(r.ok,true,JSON.stringify(r));assert.ok(calls.some(c=>!c.cfg.thinkingConfig));});
  await browser.close();srv.close();
  console.log(`\n${pass}/${pass+failed.length} PASS`);process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
