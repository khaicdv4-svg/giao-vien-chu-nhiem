const assert=require('node:assert/strict');
const path=require('path');
const fs=require('fs');
const {chromium}=require(process.env.HMV_PLAYWRIGHT || 'playwright');
(async()=>{
 const app=path.resolve(__dirname,'../app');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await ctx.route('**/*',async route=>{const url=new URL(route.request().url());let p=path.join(app,decodeURIComponent(url.pathname));if(url.pathname==='/')p=path.join(app,'index.html');if(!p.startsWith(app)||!fs.existsSync(p)||fs.statSync(p).isDirectory())return route.fulfill({status:404,body:''});const ext=path.extname(p);await route.fulfill({path:p,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'})[ext]||'application/octet-stream'});});
   for(const id of ['keo-co','duong-dua','chinh-phuc','nghieng-dau','bong-bay','binh-chon','ban-tay-phep-thuat','gio-tay','hop-qua','ai-nhanh-hon']){
    await page.goto('https://hmv.test/#trai-nghiem/'+id);await page.waitForTimeout(900);
    assert.equal(await page.locator('#hmvQrLanding').isVisible(),true,id+' landing');
    assert.equal(await page.locator('#tiltSetupModal').count(),0,'no camera settings on arrival');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,id+' width');
    if(id==='keo-co')await page.screenshot({path:'qr-entry-'+width+'.png',fullPage:true});
    await page.locator('[data-entry-settings]').click();await page.waitForTimeout(300);
    assert.equal(await page.locator('#hmvQrLanding').count(),0,id+' settings opened');
    assert.equal(await page.locator('#games').evaluate(e=>e.classList.contains('hmv-qr-entry')),false,'no hidden settings');
    await page.reload();await page.waitForTimeout(700);
    await page.locator('[data-entry-play]').click();await page.waitForTimeout(900);
    assert.equal(await page.locator('#hmvQrLanding').count(),0,id+' play opened');
    assert.equal(await page.locator('#tiltSetupModal').count(),0,id+' no settings after play');
    assert.equal(await page.evaluate(()=>classroomGame.started),true,id+' actual game started');
    console.log(width+' '+id+' landing/settings/play PASS');
   }
   for(const [id,view] of [['gioi-thieu','dashboard'],['vong-quay','picker'],['luyen-tap','questions']]){
    await page.goto('https://hmv.test/#trai-nghiem/'+id);await page.waitForTimeout(700);
    assert.equal(await page.locator('#'+view).evaluate(e=>e.classList.contains('active')),true,id+' original view');
    assert.equal(await page.locator('#hmvQrLanding').count(),0,id+' no stale landing');
   }
   assert.deepEqual(errors,[]);await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

