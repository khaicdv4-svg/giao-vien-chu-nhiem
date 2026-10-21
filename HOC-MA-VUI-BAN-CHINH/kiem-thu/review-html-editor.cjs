'use strict';
// Actual editor on an isolated loopback origin. Only synthetic IndexedDB data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const D=require('../app/review-domain.js');
const fixture=D.normalizeDocument(require('./fixtures/review-math4.json'));
const app=path.resolve(__dirname,'../app');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR);
const rows=[];
const record=(id,evidence)=>{rows.push({id,status:'PASS',evidence});console.log(id+' PASS '+evidence);};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(app,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(app+path.sep)){res.writeHead(403);return res.end();}
  const types={'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript'};
  fs.readFile(file,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':bytes);});
});
async function main(){
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  try{
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
    const origin='http://127.0.0.1:'+server.address().port;
    await context.route('**/*',route=>route.request().url().startsWith(origin+'/')||route.request().url().startsWith('file:')?route.continue():route.abort());
    const page=await context.newPage();page.setDefaultTimeout(8000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/');await page.waitForFunction(()=>!!window.HmvReviewUI);
    await page.evaluate(async raw=>{await(await HmvReviewStorage.open()).put('documents',raw);},fixture);
    await page.evaluate(()=>HmvReviewUI.open());
    await page.locator('[data-rv-open="'+fixture.id+'"]').click();
    const original=await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id);
    let downloads=0;page.on('download',()=>downloads++);
    async function download(name){
      const waiting=page.waitForEvent('download');await page.locator('#rv-export-html').click();
      const result=await waiting;assert.doesNotMatch(result.suggestedFilename(),/[<>:"/\\|?*\x00-\x1f]/);
      const file=path.join(output,name);await result.saveAs(file);return file;
    }
    async function grade(file,expected,first=1){
      const offline=await browser.newContext({offline:true,viewport:{width:390,height:844}});
      const student=await offline.newPage();
      const studentErrors=[],network=[];
      student.on('pageerror',e=>studentErrors.push(e.message));student.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      await student.goto(pathToFileURL(file).href);
      assert.equal(await student.locator('fieldset').count(),5);
      for(const [i,key] of [first,0,2,3,1].entries())await student.locator(`input[name=q${i}][value="${key}"]`).check();
      student.once('dialog',dialog=>dialog.accept());await student.locator('#submit').click();
      assert.equal(await student.locator('#result').textContent(),`Kết quả: ${expected} / 10 điểm`);
      assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual(studentErrors,[]);assert.deepEqual(network,[]);
      await student.screenshot({path:path.join(output,nameOf(file)+'.png'),fullPage:true});
      await offline.close();
    }
    const sampleFile=await download('de-goc-tu-trinh-bien-tap.html');await grade(sampleFile,10);
    record('A','Export actual editor fixture: five answers score 10/10');
    const editedText='125 + 276 bằng bao nhiêu? Tiếng Việt: </script><img src=x onerror="window.pwned=1">';
    await page.locator('[data-question="0"] [data-q="text"]').fill(editedText);
    await page.locator('[data-question="0"] [data-option="0"]').fill('401');
    await page.locator('[data-question="0"] [data-key="0"]').check();
    await page.locator('#rv-title').fill('Toán 4: chỉnh sửa / chưa lưu?');
    const editedFile=await download('de-da-sua-tu-trinh-bien-tap.html');
    const verify=await browser.newPage();await verify.goto(pathToFileURL(editedFile).href);
    assert.equal(await verify.locator('fieldset').first().locator('p').first().textContent(),editedText);
    assert.equal(await verify.locator('img[src="x"]').count(),0);assert.equal(await verify.evaluate(()=>window.pwned),undefined);await verify.close();
    record('B','Unsaved text/options/title included, injected markup inert');
    await grade(editedFile,8);await grade(editedFile,10,0);
    record('C','Old answer now scores 8/10; changed key scores 10/10 offline');
    const stored=await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id);
    assert.deepEqual(stored,original);
    await page.evaluate(()=>{const key=document.querySelector('[data-question="0"] [data-key]:checked');key.checked=false;});
    const before=downloads;await page.locator('#rv-export-html').click();
    await page.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Câu 1'));
    assert.match(await page.locator('#rv-message').textContent(),/đáp án/);assert.equal(downloads,before);
    record('D','Missing answer names Câu 1; no download');
    await page.locator('[data-question="0"] [data-key="0"]').check();
    await page.locator('[data-question="2"] [data-q="type"]').evaluate(select=>select.add(new Option('Không hỗ trợ kiểm thử','UNSUPPORTED')));
    await page.locator('[data-question="2"] [data-q="type"]').selectOption('UNSUPPORTED');
    await page.locator('#rv-export-html').click();await page.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('UNSUPPORTED'));
    assert.match(await page.locator('#rv-message').textContent(),/Câu 3.*UNSUPPORTED/);assert.equal(downloads,before);
    record('E','Unsupported Câu 3 (UNSUPPORTED) rejected, no file or conversion');
    record('F','Actual downloaded HTML opened with Chrome file URL');
    record('G','Downloaded files graded without Internet or backend at 390x844');
    await page.locator('[data-question="2"] [data-q="type"]').selectOption('SINGLE');
    // Restore the original four options and key before checking saved draft preservation.
    for(const [i,value] of fixture.questions[2].options.entries())await page.locator(`[data-question="2"] [data-option="${i}"]`).fill(value);
    await page.locator('[data-question="2"] [data-key="2"]').check();
    await page.locator('#rv-save').click();await page.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));
    const saved=await page.evaluate(async id=>await(await HmvReviewStorage.open()).get('documents',id),fixture.id);
    assert.equal(saved.questions[0].text,editedText);assert.deepEqual(saved.questions[0].correctAnswers,[0]);
    assert.equal(saved.status,'draft');assert.ok(saved.version>original.version);
    assert.equal(await page.locator('#rv-review').isDisabled(),true);assert.equal(await page.locator('#rv-publish').isDisabled(),true);
    await page.setViewportSize({width:390,height:844});
    await page.locator('#rv-export-html').scrollIntoViewIfNeeded();
    const bounds=await page.locator('#rv-export-html').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
    await page.screenshot({path:path.join(output,'editor-mobile.png'),fullPage:true});
    await download('de-xuat-tu-dien-thoai.html');
    await page.locator('#rv-library').click();await page.locator('[data-rv-open="'+fixture.id+'"]').click();
    assert.equal(await page.locator('[data-question="0"] [data-q="text"]').inputValue(),editedText);
    const published=structuredClone(fixture);published.id='published-fixture';published.status='published';published.version=3;
    await page.evaluate(async raw=>{await(await HmvReviewStorage.open()).put('documents',raw);},published);
    await page.evaluate(()=>HmvReviewUI.open());await page.locator('[data-rv-open="published-fixture"]').click();
    await page.locator('#rv-title').fill('Bản sửa từ tài liệu đã xuất bản');
    await download('ban-sua-khong-ghi-de.html');
    assert.deepEqual(await page.evaluate(async()=>await(await HmvReviewStorage.open()).get('documents','published-fixture')),published);
    await page.locator('#rv-save').click();await page.waitForFunction(()=>document.querySelector('#rv-message').textContent.includes('Đã lưu bản nháp'));
    const documents=await page.evaluate(async()=>await(await HmvReviewStorage.open()).list('documents'));
    assert.deepEqual(documents.find(d=>d.id===published.id),published);
    assert.ok(documents.some(d=>d.id!==published.id&&d.revisionOf===published.id&&d.status==='draft'&&d.version>3));
    record('H','Export does not persist source; save draft/version/reopen and approval locks work; mobile button downloads');
    assert.deepEqual(errors,[]);
    await context.close();
  }finally{
    await browser.close();await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(output,'editor-results.json'),JSON.stringify(rows,null,2));
  }
}
function nameOf(file){return path.basename(file,'.html');}
main().catch(error=>{console.error(error);process.exitCode=1;});
