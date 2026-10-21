/* Runs only against an isolated loopback server and fresh browser profiles. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.HMV_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../app');
const evidence = process.env.HMV_EVIDENCE_DIR || path.resolve(__dirname, 'review-evidence');
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.png':'image/png', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.json':'application/json', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req, res) => {
  let name;
  try { name = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch (_) { res.writeHead(400);return res.end(); }
  if (name !== root && !name.startsWith(root + path.sep)) {res.writeHead(403);return res.end();}
  if (name === root || req.url.endsWith('/')) name = path.join(name, 'index.html');
  fs.readFile(name, (err, bytes) => {res.writeHead(err ? 404 : 200, {'Content-Type':mime[path.extname(name)] || 'application/octet-stream', 'Cache-Control':'no-cache'});res.end(err ? 'Not found' : bytes);});
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({headless:true, ...(process.env.HMV_CHROME_PATH ? {executablePath:process.env.HMV_CHROME_PATH} : {})});
  const results = [], record = (name, detail) => { results.push({name,status:'PASS',detail});console.log('PASS',name); };
  fs.mkdirSync(evidence, {recursive:true});
  try {
    const context = await browser.newContext({viewport:{width:1366,height:768}});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.audioDB && window.questionBankSets?.length >= 7);
    await page.evaluate(() => window.openView('questions'));
    await page.locator('#questions [data-kho-add]').waitFor();
    const legacy = await page.evaluate(() => ({students:localStorage.getItem('tk_students'),questions:localStorage.getItem('tk_questions'),scores:localStorage.getItem('tk_scores'),sets:questionBankSets.filter(s=>!/^review-/.test(s.id)).map(s=>JSON.stringify(s)).sort()}));
    assert.equal(legacy.sets.length >= 7, true);
    record('Existing app and question bank load', {sets:legacy.sets.length});
    if (process.env.HMV_BASELINE_ONLY === '1') return;
    await page.waitForFunction(() => window.HmvReviewUI && window.HmvReviewDomain && window.HmvReviewStorage && window.HmvReviewImport);
    await page.evaluate(() => window.HmvReviewUI.open());
    await page.locator('#review').waitFor({state:'visible'});
    record('Review module opens inside existing app');

    if (process.env.HMV_FIXTURE_DIR) {
      const imports = [
        ['text.pdf','ready-for-review',1], ['questions.docx','ready-for-review',1],
        ['questions.txt','ready-for-review',1]
      ];
      if (process.env.HMV_SCAN_PDF) imports.push([process.env.HMV_SCAN_PDF,'needs-ocr',0]);
      for (const [name,status,count] of imports) {
        const file = path.isAbsolute(name) ? name : path.join(process.env.HMV_FIXTURE_DIR,name);
        const data = fs.readFileSync(file).toString('base64');
        const imported = await page.evaluate(async ([name,data]) => {
          const file = new File([Uint8Array.from(atob(data),x=>x.charCodeAt(0))],name,{type:name.endsWith('.pdf')?'application/pdf':''});
          const d = await HmvReviewImport.readFile(file);
          return {status:d.importStatus,count:d.questions.length,pages:d.source.pages.length,blob:d.source.blob.size,linked:d.questions.every(q=>q.blockIds.length>0)};
        },[path.basename(name),data]);
        assert.equal(imported.status,status);assert.equal(imported.count,count);
        assert.equal(imported.blob,fs.statSync(file).size);assert.equal(imported.linked,true);
        if(status==='needs-ocr')assert.equal(imported.pages,5);
        record('Local import '+path.basename(name),imported);
      }
      for(const name of ['invalid.pdf','html.svg']) {
        const data=fs.readFileSync(path.join(process.env.HMV_FIXTURE_DIR,name)).toString('base64');
        const rejected=await page.evaluate(async([name,data])=>{try{await HmvReviewImport.readFile(new File([Uint8Array.from(atob(data),x=>x.charCodeAt(0))],name));return false;}catch(_){return true;}},[name,data]);
        assert.equal(rejected,true);record('Reject malformed/unsupported '+name);
      }
    }

    const fixture={schemaVersion:1,id:'ui-test',title:'Ôn tập lớp 4 · Bản kiểm thử',metadata:{grade:4,subject:'Toán',topic:'Bài kiểm thử'},blocks:[{id:'reading',type:'reading',text:'Hãy đọc kĩ câu hỏi và trình bày cách làm.'}],questions:[{id:'choice-1',type:'ABCD',text:'2 + 2 = ?',options:['3','4','5','6'],correctAnswers:[1],points:1},{id:'open-1',type:'OPEN',text:'Giải thích cách cộng của em.',options:[],correctAnswers:[],points:2}]};
    await page.locator('#rv-import').setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
    await page.waitForFunction(()=>document.querySelector('#rv-title')?.value==='Ôn tập lớp 4 · Bản kiểm thử');
    await page.locator('#rv-save').click();
    await page.waitForFunction(()=>/Đã lưu bản nháp/.test(document.querySelector('#rv-message')?.textContent));
    await page.locator('#rv-review').click();
    await page.waitForFunction(()=>/Đã duyệt/.test(document.querySelector('#rv-message')?.textContent));
    await page.locator('#rv-publish').click();
    await page.waitForFunction(()=>/Đã xuất bản/.test(document.querySelector('#rv-message')?.textContent));
    record('Import, edit roundtrip, review and publish local document');
    await page.locator('#rv-practice').click();
    await page.locator('[data-answer-id="choice-1"] input[value="1"]').check();
    await page.locator('[data-answer-id="open-1"] textarea').fill('Em cộng 2 và 2 được 4.');
    await page.locator('#rv-mode').selectOption('cards');
    assert.equal(await page.locator('[data-answer-id="choice-1"] input[value="1"]').isChecked(),true);
    await page.locator('#rv-next').click();
    assert.equal(await page.locator('[data-answer-id="open-1"] textarea').inputValue(),'Em cộng 2 và 2 được 4.');
    assert.match(await page.locator('#rv-paper').innerText(),/Hãy đọc kĩ/);
    record('Worksheet/cards share answers and preserve reading block');
    await page.locator('#rv-save-attempt').click();
    await page.waitForFunction(()=>/Đã lưu bài đang làm/.test(document.querySelector('#rv-message')?.textContent));
    await page.reload();await page.waitForFunction(()=>!!window.HmvReviewUI);
    await page.evaluate(()=>HmvReviewUI.open());
    await page.getByRole('button',{name:'Mở học liệu →'}).first().click();
    await page.locator('#rv-history').click();
    await page.locator('[data-attempt]').first().click();
    await page.locator('#rv-mode').selectOption('worksheet');
    assert.equal(await page.locator('[data-answer-id="choice-1"] input[value="1"]').isChecked(),true);
    assert.equal(await page.locator('[data-answer-id="open-1"] textarea').inputValue(),'Em cộng 2 và 2 được 4.');
    record('Saved unfinished attempt resumes after reload');
    await page.locator('#rv-submit').click();
    await page.locator('[data-manual="open-1"]').waitFor();
    let stored=await page.evaluate(async()=> (await (await HmvReviewStorage.open()).list('attempts'))[0]);
    assert.equal(stored.status,'pending-manual');assert.equal(stored.score,null);assert.equal(stored.pendingManual,1);
    record('Open question prevents premature final score');
    await page.locator('[data-manual="open-1"]').fill('2');
    await page.locator('#rv-grade').click();
    await page.waitForFunction(()=>/Đã lưu điểm/.test(document.querySelector('#rv-message')?.textContent));
    stored=await page.evaluate(async()=> (await (await HmvReviewStorage.open()).list('attempts'))[0]);
    assert.equal(stored.status,'graded');assert.equal(stored.score,3);assert.equal(stored.maxScore,3);
    record('Manual grading completes correct total score');
    const interchange=await page.evaluate(async()=>HmvReviewLms.exportAttempt((await (await HmvReviewStorage.open()).list('attempts'))[0],{externalStudentId:'TEST-STUDENT',assignmentId:'TEST-ASSIGNMENT'},'csv'));
    assert.match(interchange,/TEST-STUDENT/);record('Fully graded result exports neutral CSV');
    await page.screenshot({path:path.join(evidence,'results.png'),fullPage:true});

    const persistence = await page.evaluate(async () => {
      const repo = await HmvReviewStorage.open();
      const source = new Blob(['source test'], {type:'text/plain'});
      const record = HmvReviewDomain.normalizeDocument({id:'browser-blob',title:'Lưu nguồn tiếng Việt',metadata:{grade:4,subject:'Toán',topic:'Lưu nguồn'},source:{name:'test.txt',blob:source},questions:[]});
      await repo.put('documents',record);
      const loaded = await repo.get('documents',record.id);
      const backup = await repo.exportBackup();
      await repo.remove('documents',record.id);
      await repo.importBackup(backup);
      const restored = await repo.get('documents',record.id);
      return {text:await loaded.source.blob.text(),restored:await restored.source.blob.text()};
    });
    assert.deepEqual(persistence,{text:'source test',restored:'source test'});
    record('IndexedDB commits and backup restores source Blob');
    await page.reload();await page.waitForFunction(() => !!window.HmvReviewUI);
    assert.equal(await page.evaluate(async() => !!(await (await HmvReviewStorage.open()).get('documents','browser-blob'))),true);
    record('Saved document survives reload');

    await page.evaluate(() => HmvReviewUI.open());
    await page.screenshot({path:path.join(evidence,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(evidence,'mobile.png'),fullPage:true});
    const overflow = await page.evaluate(() => document.querySelector('#review').scrollWidth > document.documentElement.clientWidth + 2);
    assert.equal(overflow,false);record('Review module fits mobile viewport');
    await page.setViewportSize({width:1366,height:768});
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:20000});
    await page.evaluate(async () => {await navigator.serviceWorker.ready;const cache=await caches.open('hmv-review-20261018-preview');return cache.keys();});
    await context.setOffline(true);await page.reload();
    await page.waitForFunction(() => !!window.HmvReviewUI, null, {timeout:15000});
    await page.evaluate(() => HmvReviewUI.open());
    await page.locator('#review').waitFor({state:'visible'});
    record('Offline reload opens review module');
    await context.setOffline(false);
    const after = await page.evaluate(() => ({students:localStorage.getItem('tk_students'),questions:localStorage.getItem('tk_questions'),scores:localStorage.getItem('tk_scores'),sets:questionBankSets.filter(s=>!/^review-/.test(s.id)).map(s=>JSON.stringify(s)).sort()}));
    assert.deepEqual(after,legacy);record('Legacy class and question data preserved');
    await page.evaluate(()=>HmvReviewUI.open());
    await page.locator('[data-rv-open="ui-test"]').click();
    await page.locator('#rv-practice').click();
    await page.locator('#rv-game').click();
    await page.locator('#rv-game-type').selectOption('millionaire');
    assert.match(await page.locator('#rv-game-report').innerText(),/1 câu tương thích/);
    await page.locator('#rv-game-play').click();
    await page.waitForFunction(()=>document.querySelector('#games').classList.contains('active'));
    const bridged=await page.evaluate(()=>({type:classroomGame.type,questions:hmvC6QuestionsForGame('millionaire').map(q=>q.id),temporary:questionBankSets.some(s=>s.name==='Ôn tập lớp 4 · Bản kiểm thử')}));
    assert.equal(bridged.type,'millionaire');assert.deepEqual(bridged.questions,['choice-1']);assert.equal(bridged.temporary,false);
    record('Game bridge uses only compatible selected questions without persisting duplicate set');
    const matrix=await page.evaluate(()=>{
      const source=HmvReviewDomain.normalizeDocument({metadata:{grade:4,subject:'Toán',topic:'Compatibility'},questions:[{id:'a',type:'ABCD',text:'2+2?',options:['3','4','5','6'],correctAnswers:[1],points:1},{id:'tf',type:'TRUEFALSE',text:'2+2=4?',options:['Đúng','Sai'],correctAnswers:[0],points:1}]});
      source.status='published';
      return ['tug','buzzer','race','gift','tiles','millionaire','balloon','poll','magic-hand','raise-hand','head-tilt','paper-mode'].map(game=>({game,ids:HmvReviewDomain.gameAdapter(source,game,hmvC6QuestionErrors).accepted.map(q=>q.id)}));
    });
    assert.equal(matrix.length,12);assert.equal(matrix.every(x=>x.ids.length>=1),true);
    assert.deepEqual(matrix.find(x=>x.game==='head-tilt').ids,['tf']);assert.deepEqual(matrix.find(x=>x.game==='paper-mode').ids,['a']);
    record('Adapters obey current compatibility rules for 12 games',matrix);
    await page.screenshot({path:path.join(evidence,'game-bridge.png'),fullPage:true});
    assert.deepEqual(errors,[]);record('No browser JavaScript errors');
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify(results,null,2));
  }
}
run().catch(e => {console.error(e);process.exitCode=1;}).finally(() => server.close());
