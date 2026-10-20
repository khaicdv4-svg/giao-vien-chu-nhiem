// Kiểm thử bản 2.17: thông báo có bản mới + nút "Cập nhật phiên bản mới" (thay Ctrl+F5), với service worker thật.
// Chép app vào thư mục tạm rồi sửa sw.js/tệp trong bản chép để giả lập bản mới; không đụng vào app gốc.
const assert=require('node:assert/strict');const {chromium}=require(process.env.HMV_PLAYWRIGHT||'playwright');const {spawn}=require('child_process');const fs=require('fs'),path=require('path'),os=require('os');
const src=path.resolve(__dirname,'../app');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hmv-cap-nhat-'));fs.cpSync(src,dir,{recursive:true});
const port=19000+process.pid%10000,base='http://127.0.0.1:'+port+'/';
(async()=>{const srv=spawn(process.execPath,[path.join(__dirname,'static.cjs'),dir,String(port)]);await new Promise(r=>srv.stdout.once('data',r));
const b=await chromium.launch();try{
for(const w of [1440,390]){
 // reset files
 fs.copyFileSync(src+'/sw.js',dir+'/sw.js');fs.copyFileSync(src+'/qr-experiences.js',dir+'/qr-experiences.js');
 const ctx=await b.newContext({viewport:{width:w,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
 await p.goto(base);await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForTimeout(1500);
 assert.ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'controlled');
 // nút có trong Cài đặt (và thanh bên trên máy tính)
 await p.evaluate(()=>openView('settings'));await p.waitForTimeout(300);
 assert.equal(await p.locator('#settings .hmv-update-card .hmv-update-btn').isVisible(),true,'settings button');
 if(w===1440)assert.equal(await p.locator('.nav-tools .hmv-update-btn').isVisible(),true,'sidebar button');
 // A. Có bản mới -> thông báo -> Cập nhật ngay
 fs.writeFileSync(dir+'/sw.js',fs.readFileSync(dir+'/sw.js','utf8').replace(/const CACHE_NAME = '[^']+'/,"const CACHE_NAME = 'hmv-test-v2'"));
 await p.evaluate(()=>hmvCapNhat.check());await p.waitForSelector('#hmvUpdateBanner',{timeout:20000});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'banner fits');
 assert.ok(await p.locator('#settings .hmv-update-btn.has-update').count()===1,'badge Mới');
 await Promise.all([p.waitForNavigation({timeout:15000}),p.locator('[data-up-now]').click()]);await p.waitForTimeout(1500);
 assert.ok((await p.evaluate(()=>caches.keys())).includes('hmv-test-v2'),'new version active');
 assert.equal(await p.locator('#hmvUpdateBanner').count(),0,'no banner after update');
 // B. Không có bản sw mới nhưng tệp đổi -> nút làm mới tệp (giống Ctrl+F5)
 fs.appendFileSync(dir+'/qr-experiences.js','\n/*MARK-'+w+'*/\n');
 assert.ok(!(await p.evaluate(()=>caches.open('hmv-test-v2').then(c=>c.match('./qr-experiences.js')).then(r=>r.text()))).includes('MARK-'+w),'stale before');
 await p.evaluate(()=>openView('settings'));await p.waitForTimeout(200);
 await Promise.all([p.waitForNavigation({timeout:40000}),p.locator('#settings .hmv-update-btn').click()]);await p.waitForTimeout(1200);
 assert.ok((await p.evaluate(()=>caches.open('hmv-test-v2').then(c=>c.match('./qr-experiences.js')).then(r=>r.text()))).includes('MARK-'+w),'refreshed file');
 // C. Mất mạng -> báo cần Internet, không tải lại
 await ctx.setOffline(true);await p.evaluate(()=>openView('settings'));await p.locator('#settings .hmv-update-btn').click();await p.waitForTimeout(400);
 assert.match(await p.locator('#toast').innerText(),/Internet/);await ctx.setOffline(false);
 // D. Để sau
 fs.writeFileSync(dir+'/sw.js',fs.readFileSync(dir+'/sw.js','utf8').replace(/const CACHE_NAME = '[^']+'/,"const CACHE_NAME = 'hmv-test-v3'"));
 await p.evaluate(()=>hmvCapNhat.check());await p.waitForSelector('#hmvUpdateBanner',{timeout:20000});await p.locator('[data-up-later]').click();
 assert.equal(await p.locator('#hmvUpdateBanner').count(),0);assert.ok(await p.locator('.hmv-update-btn.has-update').count()>=1,'badge stays');
 assert.deepEqual(errs,[]);console.log(w,'update PASS');await ctx.close();
}
 console.log('PASS: cap nhat 2.17');
}finally{await b.close();srv.kill();fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
