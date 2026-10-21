'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const {renderHtml}=require('../review-html.cjs');
const sample=require('./fixtures/review-math4.json');
async function main(){
  const dir=path.resolve(process.argv[2]);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'toan-lop-4-luyen-tap.html'),renderHtml(sample),'utf8');
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  const records=[];
  try{
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},offline:true});
      const page=await context.newPage();
      const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
      await page.goto(pathToFileURL(path.join(dir,'toan-lop-4-luyen-tap.html')).href);
      assert.equal(await page.locator('fieldset').count(),5);
      let dialogText='';
      page.once('dialog',async dialog=>{dialogText=dialog.message();await dialog.dismiss();});
      await page.locator('#submit').click();
      assert.match(dialogText,/5 câu chưa trả lời/);
      assert.equal(await page.locator('#submit').isEnabled(),true);
      for(const [i,value] of [1,0,2,3,1].entries()) await page.locator(`input[name=q${i}][value="${value}"]`).check();
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#submit').click();
      assert.equal(await page.locator('#result').textContent(),'Kết quả: 10 / 10 điểm');
      assert.equal(await page.locator('input:disabled').count(),20);
      await page.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{cancelable:true}));});
      assert.equal(await page.locator('#result').textContent(),'Kết quả: 10 / 10 điểm');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(dir,mobile?'mobile.png':'desktop.png'),fullPage:true});
      // Actual browser blank/wrong/correct flow, beyond unit grading.
      await page.evaluate(()=>localStorage.clear());
      await page.reload();
      await page.locator('input[name=q0][value="1"]').check();
      await page.locator('input[name=q1][value="1"]').check();
      page.once('dialog',async dialog=>{assert.match(dialog.message(),/3 câu chưa trả lời/);await dialog.accept();});
      await page.locator('#submit').click();
      assert.equal(await page.locator('#result').textContent(),'Kết quả: 2 / 10 điểm');
      assert.match(await page.locator('#feedback-1').textContent(),/Chưa đúng/);
      assert.match(await page.locator('#feedback-2').textContent(),/Chưa trả lời/);
      const evil=structuredClone(sample);
      const attack='</script><img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
      evil.title=attack;evil.questions[0].text=attack;evil.questions[0].options[0]=attack;
      const evilPath=path.join(dir,'escape-test.html');fs.writeFileSync(evilPath,renderHtml(evil));
      await page.goto(pathToFileURL(evilPath).href);
      assert.equal(await page.locator('img[src="x"]').count(),0);
      assert.equal(await page.evaluate(()=>window.pwned),undefined);
      assert.equal(await page.locator('h1').textContent(),attack);
      assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
      records.push({viewport:mobile?'390x844':'1280x900',status:'PASS',checks:['file URL + offline','five answers 10/10','missing confirmation + cancel','wrong/blank 2/10','repeat submission stable','no horizontal overflow','XSS inert','no network or JS errors']});
      await context.close();
    }
    fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify(records,null,2));
    console.log(JSON.stringify(records,null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
