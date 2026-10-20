const assert = require('node:assert/strict');
const {chromium} = require(process.env.HMV_PLAYWRIGHT || 'playwright');
const port=19000+process.pid%10000;
const base = 'http://127.0.0.1:'+port+'/';
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const jsQR=require(process.env.HMV_JSQR||'jsqr');
const {PNG}=require(process.env.HMV_PNGJS||'pngjs');
(async()=>{
 const server=spawn(process.execPath,[path.join(__dirname,'static.cjs'),path.join(__dirname,'../app'),String(port)],{stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('server exit '+c)))});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base); await page.waitForTimeout(1200);
  assert.equal(await page.locator('#hmvQrGalleryLink').count(),1,'QR gallery entry exists');
  const routes=[['gioi-thieu','dashboard'],['vong-quay','picker'],['keo-co','games'],['duong-dua','games'],['chinh-phuc','games'],['nghieng-dau','games'],['bong-bay','games'],['luyen-tap','questions'],['binh-chon','games'],['ban-tay-phep-thuat','games'],['gio-tay','games'],['hop-qua','games'],['ai-nhanh-hon','games'],['not-nhac','games']];
  for(const [slug,view] of routes){
   await page.goto(base+'#trai-nghiem/'+slug); await page.waitForTimeout(600);
   assert.equal(await page.locator('#'+view).evaluate(e=>e.classList.contains('active')),true,slug);
   assert.equal(await page.locator('#hmvQrLanding h2, #hmvQrExperienceTitle').innerText(),await page.evaluate(s=>hmvQr.items.find(x=>x.id===s).title,slug));
  }
  await page.goto(base); await page.waitForTimeout(600);
  await page.evaluate(()=>{openView('games');gameBack();}); await page.waitForTimeout(400);
  assert.equal(await page.locator('#games .game-library-card').count(),await page.locator('#games .game-library-card .hmv-card-qr').count(),'QR attached to every game card');
  assert.ok(await page.locator('#games .hmv-card-qr').count()>=11,'11 game cards with QR');
  await page.locator('#games .hmv-card-qr').first().click();
  assert.equal(await page.locator('#hmvQrDialog').count(),1);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#hmvQrDialog').count(),0);
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'qr.html'); await page.waitForTimeout(400);
  const total=await page.evaluate(()=>hmvQr.items.length);assert.equal(total,14);
  assert.equal(await page.locator('.qr-poster').count(),total);
  assert.equal(await page.locator('.qr-poster img').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth>0).length),total,'all poster images render');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile gallery fits');
  const out=path.join(__dirname,'../qr-delivery');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'qr-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:path.join(out,'qr-gallery.png'),fullPage:true});
  const items=await page.evaluate(()=>hmvQr.items);
  for(const x of items){
   await page.goto(base+'qr.html');
   await page.setContent(fs.readFileSync(path.join(__dirname,'../app/assets/qr/'+x.id+'-poster.svg'),'utf8'));
   const shot=PNG.sync.read(await page.locator('svg').first().screenshot());
   const decoded=jsQR(new Uint8ClampedArray(shot.data),shot.width,shot.height);
   assert.equal(decoded?.data,'https://giao-vien-chu-nhiem.vercel.app/#trai-nghiem/'+x.id,'independent decode '+x.id);
  }
  await page.goto(base+'qr.html');await page.evaluate(()=>document.fonts.ready);await page.pdf({path:path.join(out,'ma-QR-ThayKhaiEdu.pdf'),printBackground:true,preferCSSPageSize:true});
  for(const [slug,view] of routes){
   console.log('Cold mobile '+slug);
   const ctx=await browser.newContext({viewport:{width:390,height:844}});const cold=await ctx.newPage();
   await cold.goto(base+'#trai-nghiem/'+slug);await cold.waitForTimeout(700);
   assert.ok(await cold.locator('#'+view).evaluate(e=>e.classList.contains('active')),'cold mobile '+slug);
   await ctx.close();
  }
  console.log('Offline cache check');
  await page.goto(base);await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker not ready')),15000))]));await page.reload();
  await page.context().setOffline(true);await page.goto(base+'#trai-nghiem/keo-co');await page.waitForTimeout(500);
  assert.ok(await page.locator('#games').evaluate(e=>e.classList.contains('active')),'offline route');
  await page.goto(base+'qr.html');assert.equal(await page.locator('.qr-poster').count(),14,'offline gallery');
  await page.context().setOffline(false);
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS: 14 routes, QR on every game card, dialog, mobile gallery');
 }finally{await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
