'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.HMV_PLAYWRIGHT_PATH||'playwright');
const html=require('../review-html.cjs'),domain=require('../app/review-domain.js');
const fixture=require('./fixtures/review-grid4.json');
const output=path.resolve(process.env.HMV_EVIDENCE_DIR);
const app=path.resolve(__dirname,'../app');
const rows=[];function pass(id,detail){rows.push({id,status:'PASS',detail});console.log(id+' PASS '+detail);}
const cell=(page,question,row,col)=>page.locator(`[data-grid-question="${question}"] .grid-cell[data-row="${row}"][data-col="${col}"]`);
const state=async(page)=>page.evaluate(()=>{const name=Object.keys(localStorage).find(key=>key.startsWith('hmv-practice-v1-'));return JSON.parse(localStorage.getItem(name)).attempt;});
async function drawMouse(page,question,start,end){
  const board=page.locator(`[data-grid-question="${question}"] .grid-board`);
  await board.scrollIntoViewIfNeeded();
  const box=await board.boundingBox();
  const point=([row,col])=>({x:box.x+(col+.5)*42,y:box.y+(row+.5)*42});
  const a=point(start),b=point(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:9});await page.mouse.up();
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const file=path.join(output,'toan-4-vo-o-li.html');
  fs.writeFileSync(file,html.renderHtml(fixture),'utf8');
  const browser=await chromium.launch({headless:true,executablePath:process.env.HMV_CHROME_PATH});
  const errors=[],network=[];
  try{
    const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:390,height:900},hasTouch:true});
    const page=await context.newPage();page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
    await page.goto(pathToFileURL(file).href);
    assert.equal(await page.locator('.grid-notebook').count(),4);
    assert.equal(await page.locator('[data-grid-question="0"] .grid-cell').count(),7*5);
    assert.equal(await page.locator('[data-grid-question="2"] .grid-cell').count(),13*5);
    assert.equal(await page.locator('[data-grid-question="3"] .grid-cell').count(),14*5);
    assert.equal(await page.locator('.grid-stroke').count(),0);
    pass('1/3/4','3, 9 and 10-digit calculations use 7, 13 and 14 readable columns; no pre-drawn line');

    await cell(page,0,0,5).fill('125');
    await cell(page,0,1,5).pressSequentially('375');
    let answer=(await state(page)).answers.add3;
    assert.equal([3,4,5].map(col=>answer.cells['0:'+col]).join(''),'125');
    assert.equal([3,4,5].map(col=>answer.cells['1:'+col]).join(''),'375');
    await cell(page,0,0,4).fill('9');answer=(await state(page)).answers.add3;
    assert.equal(answer.cells['0:4'],'9');
    assert.equal(answer.cells['0:5'],'5');
    await cell(page,0,0,1).fill('7');answer=(await state(page)).answers.add3;
    assert.equal(answer.cells['0:1'],'7');
    pass('5/6/7','one mark per cell, quick multi-digit entry, middle correction and intentional wrong column retained');
    await page.locator('[data-grid-question="0"] [data-grid-tool="undo"]').click();
    answer=(await state(page)).answers.add3;assert.equal(answer.cells['0:1'],undefined);
    await page.locator('[data-grid-question="0"] [data-grid-tool="undo"]').click();
    answer=(await state(page)).answers.add3;assert.equal(answer.cells['0:4'],'2');
    pass('12','multiple undo steps restore separate number edits');

    await page.locator('[data-grid-question="0"] [data-grid-tool="ruler"]').click();
    await drawMouse(page,0,[1,3],[1,5]);
    answer=(await state(page)).answers.add3;
    assert.deepEqual(answer.lines.map(line=>[line.orientation,line.boundary,line.start,line.end]),[['h',2,3,5]]);
    await page.locator('[data-grid-question="0"]').screenshot({path:path.join(output,'390-3-digit-ruler.png')});
    pass('8','mouse drag creates short horizontal data stroke on cell boundary');
    await cell(page,0,2,3).click();await cell(page,0,2,5).click();
    answer=(await state(page)).answers.add3;assert.equal(answer.lines.length,2);
    pass('10','two taps create a second separate horizontal stroke');
    await page.locator('[data-grid-question="0"] [data-grid-tool="erase"]').click();
    await page.locator('[data-grid-question="0"] .grid-stroke').first().click();
    answer=(await state(page)).answers.add3;assert.equal(answer.lines.length,1);
    await page.locator('[data-grid-question="0"] [data-grid-tool="undo"]').click();
    answer=(await state(page)).answers.add3;assert.equal(answer.lines.length,2);
    pass('11/12','eraser removes one selected stroke; undo restores it');

    await page.locator('[data-grid-question="1"] [data-grid-tool="write"]').click();
    await cell(page,1,0,5).fill('402');await cell(page,1,1,5).fill('178');
    answer=(await state(page)).answers.subtract;
    assert.equal([3,4,5].map(col=>answer.cells['0:'+col]).join(''),'402');
    assert.equal([3,4,5].map(col=>answer.cells['1:'+col]).join(''),'178');
    pass('2','borrowing subtraction retains exactly the student-entered layout; no computed result');

    await cell(page,2,0,11).fill('123456789');
    answer=(await state(page)).answers.add9;
    assert.equal(Array.from({length:9},(_,i)=>answer.cells['0:'+(i+3)]).join(''),'123456789');
    await page.locator('[data-grid-question="2"]').screenshot({path:path.join(output,'390-9-digit.png')});
    await cell(page,3,0,12).fill('1000000000');
    answer=(await state(page)).answers.billion;
    assert.equal(Array.from({length:10},(_,i)=>answer.cells['0:'+(i+3)]).join(''),'1000000000');
    pass('3/4','nine and ten digits fit without dropping significant zeroes; mobile board scrolls horizontally');

    await page.locator('textarea[name=q4]').fill('Em đặt tính theo hàng đơn vị.\nDòng hai có dấu tiếng Việt.');
    await page.locator('textarea[name=q5]').fill('Văn bản cũ vẫn dùng được.');
    await page.locator('input[name=q6][value="1"]').check();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.reload();
    answer=(await state(page)).answers.add3;
    assert.equal(answer.lines.length,2);assert.equal(answer.cells['0:3'],'1');
    assert.equal(await page.locator('textarea[name=q4]').inputValue(),'Em đặt tính theo hàng đơn vị.\nDòng hai có dấu tiếng Việt.');
    assert.equal(await page.locator('textarea[name=q5]').inputValue(),'Văn bản cũ vẫn dùng được.');
    await page.locator('[data-grid-question="2"] [data-grid-tool="undo"]').click();
    assert.equal(Object.keys((await state(page)).answers.add9.cells).length,0);
    await cell(page,2,0,11).fill('123456789');
    pass('13/15/16/17','offline reload restores digits, lines and Vietnamese text; plain textarea remains; 390px no page overflow');

    // A real touch-capable Chromium context receives a CDP touch sequence, not only a mouse event.
    await page.locator('[data-grid-question="1"] [data-grid-tool="ruler"]').click();
    const touchBoard=page.locator('[data-grid-question="1"] .grid-board');
    await touchBoard.scrollIntoViewIfNeeded();
    const boardBox=await touchBoard.boundingBox();
    const cdp=await context.newCDPSession(page);
    const a={x:boardBox.x+3.5*42,y:boardBox.y+1.5*42},b={x:boardBox.x+5.5*42,y:boardBox.y+1.5*42};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    answer=(await state(page)).answers.subtract;
    assert.equal(answer.lines.length,1);assert.equal(answer.lines[0].orientation,'h');
    pass('9','CDP touch events create a ruler line in emulated touch Chrome; physical device still untested');

    page.once('dialog',dialog=>dialog.accept());await page.locator('#submit').click();
    assert.match(await page.locator('#result').textContent(),/Đã chấm: 1 \/ 1 điểm.*tối đa 11 điểm.*Chưa có điểm tổng chính thức/);
    assert.equal(await cell(page,0,0,3).isDisabled(),true);
    assert.equal(await page.locator('[data-grid-question="0"] [data-grid-tool="erase"]').isDisabled(),true);
    const waiting=page.waitForEvent('download');await page.locator('#export-submission').click();
    const downloaded=await waiting;const jsonFile=path.join(output,'bai-lam-o-li.json');await downloaded.saveAs(jsonFile);
    const submission=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
    assert.equal(submission.answers.add3.cells['0:3'],'1');
    assert.equal(submission.answers.add3.lines.length,2);
    assert.equal(submission.answers.subtract.lines.length,1);
    assert.equal(submission.answers.writing.includes('tiếng Việt'),true);
    assert.equal(submission.score,null);
    await page.reload();assert.equal(await cell(page,0,0,3).isDisabled(),true);
    assert.equal((await state(page)).answers.add3.lines.length,2);
    pass('14','submitted grid and ruler strokes stay locked after reload and survive JSON download');
    await context.close();

    const desktopContext=await browser.newContext({offline:true,viewport:{width:1366,height:900}});
    const desktop=await desktopContext.newPage();desktop.on('pageerror',error=>errors.push(error.message));
    await desktop.goto(pathToFileURL(file).href);
    await cell(desktop,0,0,5).fill('125');
    await desktop.locator('[data-grid-question="0"] [data-grid-tool="ruler"]').click();
    await drawMouse(desktop,0,[1,3],[1,5]);
    await desktop.locator('[data-grid-question="0"]').screenshot({path:path.join(output,'1366-3-digit-ruler.png')});
    await cell(desktop,2,0,11).fill('123456789');
    await desktop.locator('[data-grid-question="2"]').screenshot({path:path.join(output,'1366-9-digit.png')});
    await desktop.locator('[data-grid-question="3"] [data-grid-tool="ruler"]').click();
    await drawMouse(desktop,3,[0,4],[3,4]);
    assert.deepEqual((await state(desktop)).answers.billion.lines.map(line=>line.orientation),['v']);
    assert.equal(await desktop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await desktopContext.close();
    pass('16/vertical','1366px screenshots checked at 3 and 9 digits; division-style vertical ruler line stays answer data');

    // The existing editor remains the source of truth for per-question presentation.
    const server=http.createServer((req,res)=>{
      const pathname=new URL(req.url,'http://localhost').pathname;
      const target=path.resolve(app,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(app+path.sep)){res.writeHead(403);return res.end();}
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript'};
      fs.readFile(target,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(error?'Not found':bytes);});
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{
      const origin='http://127.0.0.1:'+server.address().port;
      const editorContext=await browser.newContext({acceptDownloads:true});
      await editorContext.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
      const editor=await editorContext.newPage();editor.on('pageerror',error=>errors.push(error.message));
      await editor.goto(origin+'/');await editor.waitForFunction(()=>!!window.HmvReviewUI);
      const original=domain.normalizeDocument(fixture);
      await editor.evaluate(async value=>{await(await HmvReviewStorage.open()).put('documents',value);},original);
      await editor.evaluate(()=>HmvReviewUI.open());await editor.locator('[data-rv-open="grid-math4"]').click();
      assert.equal(await editor.locator('[data-question="0"] [data-q="answerLayout"]').inputValue(),'grid-calculation');
      await editor.locator('[data-question="5"] [data-q="answerLayout"]').selectOption('grid-text');
      await editor.locator('#rv-preview-html').click();
      await editor.waitForFunction(()=>!document.querySelector('#rv-html-preview').hidden);
      assert.equal(await editor.frameLocator('#rv-html-preview').locator('.grid-notebook').count(),4);
      const downloadWait=editor.waitForEvent('download');await editor.locator('#rv-export-html').click();
      const exported=await downloadWait;const exportedPath=path.join(output,'toan-4-vo-o-li-tu-trinh-bien-tap.html');await exported.saveAs(exportedPath);
      assert.match(fs.readFileSync(exportedPath,'utf8'),/notebook-text/);
      assert.deepEqual(await editor.evaluate(async()=>await(await HmvReviewStorage.open()).get('documents','grid-math4')),original);
      await editor.locator('#rv-save').click();await editor.waitForFunction(()=>document.querySelector('#rv-message')?.textContent.includes('Đã lưu bản nháp'));
      assert.equal((await editor.evaluate(async()=>await(await HmvReviewStorage.open()).get('documents','grid-math4'))).questions[5].metadata.answerLayout,'grid-text');
      await editorContext.close();
      pass('editor','mode selection, preview, live export and draft save use the existing editor without modifying source on export');
    }finally{await new Promise(resolve=>server.close(resolve));}
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({rows,errors,network},null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
