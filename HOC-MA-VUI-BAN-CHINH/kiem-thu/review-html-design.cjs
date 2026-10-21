'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const {renderHtml}=require('../review-html.cjs');
const sample=require('./fixtures/review-math4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR);
const rows=[];
async function main(){
  fs.mkdirSync(output,{recursive:true});
  // Optional real editor download, so screenshots can verify the delivered export.
  const sampleFile=process.argv[2]?path.resolve(process.argv[2]):path.join(output,'toan-4-phieu-luyen-tap-v1.html');
  if(!process.argv[2])fs.writeFileSync(sampleFile,renderHtml(sample));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  try{
    for(const width of [390,1366]){
      const context=await browser.newContext({offline:true,viewport:{width,height:900},reducedMotion:'reduce'});
      const page=await context.newPage();const errors=[],network=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      await page.goto(pathToFileURL(sampleFile).href);
      assert.equal(await page.locator('.children-art img').count(),1);
      assert.equal(await page.locator('.children-art img').evaluate(image=>image.complete&&image.naturalWidth===640),true);
      assert.equal(await page.locator('.result-panel').isVisible(),false);
      assert.equal(await page.locator('.question-text').allTextContents().then(texts=>JSON.stringify(texts)),JSON.stringify(sample.questions.map(q=>q.text)));
      assert.deepEqual(await page.locator('.option-text').allTextContents(),sample.questions.flatMap(q=>q.options));
      assert.equal(await page.locator('#progress-text').textContent(),'Đã trả lời 0 / 5 câu');
      const metrics=await page.locator('.option').first().evaluate(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
      assert.ok(metrics.height>=48);assert.ok(metrics.font>=18);
      await page.locator('input[name=q0][value="0"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('input[name=q0][value="1"]').isChecked(),true);
      const focus=await page.locator('input[name=q0]:checked').evaluate(el=>getComputedStyle(el.closest('label')).outlineStyle);
      assert.equal(focus,'solid');
      assert.equal(await page.locator('#progress-text').textContent(),'Đã trả lời 1 / 5 câu');
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:path.join(output,`${width}-questions.png`)});
      await page.locator('fieldset').first().screenshot({path:path.join(output,`${width}-question-detail.png`)});
      await page.locator('#submit').scrollIntoViewIfNeeded();
      page.once('dialog',async d=>{assert.match(d.message(),/4 câu chưa trả lời/);await d.dismiss();});await page.locator('#submit').click();
      assert.equal(await page.locator('#submit').isEnabled(),true);
      assert.equal(await page.locator('.result-panel').isVisible(),false);
      for(const [i,value] of [1,0,2,3,1].entries())await page.locator(`input[name=q${i}][value="${value}"]`).check();
      assert.equal(await page.locator('#progress-text').textContent(),'Đã trả lời 5 / 5 câu');
      page.once('dialog',d=>d.accept());await page.locator('#submit').click();
      assert.equal(await page.locator('#result').textContent(),'Kết quả: 10 / 10 điểm');
      assert.equal(await page.locator('.result-panel').isVisible(),true);
      assert.equal(await page.locator('input:disabled').count(),20);
      await page.locator('.result-panel').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,`${width}-result.png`)});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      // The document intentionally uses the same light palette under OS dark mode.
      await page.emulateMedia({colorScheme:'dark'});
      assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(247, 246, 241)');
      const long=structuredClone(sample);long.questions[0].text+=' '+('Nội dung Tiếng Việt có dấu. '.repeat(30));long.questions[0].options[0]='Văn bản dài '+('abcdef'.repeat(100));
      const file=path.join(output,'long-content-test.html');fs.writeFileSync(file,renderHtml(long));await page.goto(pathToFileURL(file).href);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator('.question-text').first().textContent(),long.questions[0].text.trim());
      // Age tokens apply to the same renderer without altering input questions/keys.
      const sizes=[];
      for(const grade of [1,3,5]){
        const exam=structuredClone(sample);exam.metadata.grade=grade;
        const target=path.join(output,`grade-${grade}-tokens.html`);fs.writeFileSync(target,renderHtml(exam));await page.goto(pathToFileURL(target).href);
        sizes.push(await page.locator('.option').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      assert.deepEqual(sizes,[22,20,18]);
      assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
      rows.push({viewport:`${width}x900`,status:'PASS',checks:['content unchanged','keyboard radio + visible focus','live progress','confirm/cancel unchanged','10/10 offline','responsive long text','age tokens 22/20/18px','reduced motion','dark OS retains light palette','no network/JS errors']});
      await context.close();
    }
    fs.writeFileSync(path.join(output,'design-results.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
