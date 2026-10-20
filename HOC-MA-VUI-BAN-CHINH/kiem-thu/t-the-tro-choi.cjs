// Kiểm thử bản 2.16: thẻ trò chơi gọn (thông tin + QR), bấm thẻ mở màn hình chính của trò.
// Chạy: node kiem-thu/t-the-tro-choi.cjs (cần Playwright; đặt HMV_PLAYWRIGHT nếu module ở nơi khác).
// Tài nguyên phục vụ từ thư mục app bằng request routing; không thay cho thử điện thoại thật.
const assert=require('node:assert/strict');const path=require('path'),fs=require('fs');
const {chromium}=require(process.env.HMV_PLAYWRIGHT||'playwright');
const app=path.resolve(__dirname,'../app');
async function serve(ctx){await ctx.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='hmv.test')return route.fulfill({status:404,body:''});let p=path.join(app,decodeURIComponent(url.pathname));if(url.pathname==='/')p=path.join(app,'index.html');if(!p.startsWith(app)||!fs.existsSync(p)||fs.statSync(p).isDirectory())return route.fulfill({status:404,body:''});const ext=path.extname(p);await route.fulfill({path:p,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'})[ext]||'application/octet-stream'});});}
async function card(p,t){const L=p.locator('#games .hmv-game-card[data-game-type="'+t+'"] h3');await L.scrollIntoViewIfNeeded();const bb=await L.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(300);}
(async()=>{const b=await chromium.launch();
for(const w of [390,1440]){const ctx=await b.newContext({viewport:{width:w,height:900},serviceWorkers:'block'});await serve(ctx);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('https://hmv.test/');await p.waitForTimeout(1300);await p.evaluate(()=>openView('games'));await p.waitForTimeout(900);
 assert.equal(await p.locator('#games .game-library-card').count(),11);
 assert.equal(await p.locator('#games .game-library-card .hmv-card-qr').count(),11,'QR on every card');
 assert.equal(await p.locator('#games .game-card-actions').count(),0,'no old buttons on cards');
 assert.equal(await p.locator('#games .hmv-card-qr img').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth>0).length),11,'QR images load');
 // QR trên thẻ mở hộp phóng lớn, không mở trò.
 await p.locator('#games .hmv-game-card[data-game-type="poll"] .hmv-card-qr').click();assert.equal(await p.locator('#hmvQrDialog').count(),1);assert.equal(await p.locator('#hmvQrLanding').count(),0);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#hmvQrDialog').count(),0);
 // Bàn phím: Tab tới nút Vào trò chơi rồi Enter.
 await p.locator('#games .hmv-game-card[data-game-type="gift"] .hmv-card-enter').focus();await p.keyboard.press('Enter');await p.waitForTimeout(300);
 assert.equal(await p.locator('#hmvQrLanding h2').innerText(),'Hộp quà bí mật');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'landing width');
 // Nút quay lại thư viện.
 await p.locator('[data-entry-back]').click();await p.waitForTimeout(400);
 assert.equal(await p.locator('#hmvQrLanding').count(),0);assert.equal(await p.locator('#games .game-library').isVisible(),true,'back to library');
 // Bộ lọc vẫn hoạt động và thẻ vẫn gọn.
 await p.locator('#games .game-filterbar button',{hasText:'Cá nhân'}).click();await p.waitForTimeout(400);
 assert.equal(await p.locator('#games .game-card-actions').count(),0,'filtered cards clean');assert.ok(await p.locator('#games .hmv-card-qr').count()>=1);
 await p.locator('#games .game-filterbar button',{hasText:'Tất cả'}).click();await p.waitForTimeout(400);
 // Nốt nhạc vui.
 await p.evaluate(()=>openView('games'));await p.waitForTimeout(500);
 await card(p,'note-music');assert.equal(await p.locator('#hmvQrLanding h2').innerText(),'Nốt nhạc vui');
 await p.locator('[data-entry-play]').click();await p.waitForTimeout(600);assert.equal(await p.locator('#windActivityOverlay').count(),1,'note module opened');
 await p.evaluate(()=>{var o=document.getElementById('windActivityOverlay');if(o)o.remove();openView('games');});await p.waitForTimeout(600);
 await card(p,'note-music');await p.locator('[data-entry-settings]').click();await p.waitForTimeout(700);
 assert.equal(await p.locator('.module-settings-overlay').count(),1,'note settings opened');
 // Dấu “Mở gần nhất”.
 await p.evaluate(()=>{document.querySelectorAll('.module-settings-overlay').forEach(e=>e.remove());openView('games');gameBack();});await p.waitForTimeout(600);
 assert.match(await p.locator('#games .hmv-game-card[data-game-type="note-music"] .hmv-card-last').innerText(),/hôm nay/);
 assert.deepEqual(errs,[]);console.log(w,'extra PASS');await ctx.close();}
// Mã QR mới: mở thẳng màn hình chính khi quét (máy mới, chưa có dữ liệu).
for(const [id,title] of [['binh-chon','Bình chọn ngón tay'],['ban-tay-phep-thuat','Bàn tay phép thuật'],['gio-tay','Giơ tay giành quyền'],['hop-qua','Hộp quà bí mật'],['ai-nhanh-hon','Ai nhanh hơn'],['not-nhac','Nốt nhạc vui']]){
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await serve(ctx);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('https://hmv.test/#trai-nghiem/'+id);await p.waitForTimeout(1200);
 assert.equal(await p.locator('#hmvQrLanding h2').innerText(),title,id);
 await p.locator('[data-entry-play]').click();await p.waitForTimeout(800);assert.equal(await p.locator('#hmvQrLanding').count(),0);
 if(id!=='not-nhac')assert.equal(await p.evaluate(()=>classroomGame.started),true,id+' started');else assert.equal(await p.locator('#windActivityOverlay').count(),1);
 assert.deepEqual(errs,[]);console.log('QR route '+id+' PASS');await ctx.close();}
console.log('PASS: the tro choi 2.16');await b.close();})().catch(e=>{console.error(e);process.exitCode=1});
