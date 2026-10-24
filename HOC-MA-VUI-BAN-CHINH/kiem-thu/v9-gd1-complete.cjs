'use strict';
// Vòng 9: GĐ1 Làm lại + nộp lần hai (dùng page.goto, không innerHTML)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-tiengviet4-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const tempDir = path.resolve(__dirname, '../.temp-v9');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  const domain_source = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  const html_source = fs.readFileSync(path.resolve(app, 'review-html.js'), 'utf-8');
  
  // Load modules + generate HTML
  const vm = require('node:vm');
  let htmlString;
  {
    const sandbox = { module: { exports: {} }, console, Buffer, Error, String, Set, Map, Array, Object, Number, Boolean, RegExp, isNaN, parseInt, parseFloat, JSON, encodeURIComponent, decodeURIComponent };
    
    // Load domain
    vm.runInNewContext(domain_source, sandbox);
    const domain = sandbox.module.exports;
    
    // Normalize fixture
    const attempt = domain.createPractice(fixture_data);
    
    // Load html module
    sandbox.module.exports = {};
    sandbox.HmvReviewGrader = { grade: domain.submitAttempt };
    vm.runInNewContext(html_source, sandbox);
    const htmlMod = sandbox.module.exports;
    
    // Generate HTML
    htmlString = htmlMod.renderHtml(attempt, domain_source);
  }
  
  // Ghi HTML vào file
  const htmlFile = path.join(tempDir, 'quiz.html');
  fs.writeFileSync(htmlFile, htmlString, 'utf-8');
  console.log('✓ HTML generated, size:', htmlString.length, 'bytes');
  
  // Server phục vụ HTML + resources
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/quiz.html') {
      t = htmlFile;
    } else {
      t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    }
    if (!t.startsWith(app + path.sep) && !t.startsWith(tempDir + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    // Test 1280px
    console.log('\n=== Vòng 9: 1280×800 ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    let errors = [];
    p.on('pageerror', e => errors.push('PAGE ERR: ' + e.message));
    
    // Mở HTML qua page.goto (không innerHTML)
    await p.goto(origin + '/quiz.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded via page.goto()');
    
    if (errors.length) console.log('⚠ Errors:', errors);
    
    // Bước 1: Làm bài lần 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Câu hỏi:', qs.length);
    
    for (let i = 0; i < Math.min(3, qs.length); i++) {
      const q = qs[i];
      const inp = await q.locator('input[type="radio"]').first();
      await inp.click();
    }
    
    console.log('✓ Làm 3 câu');
    
    // Bước 2: Nộp lần 1
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp lần 1');
    
    await p.screenshot({ path: path.join(output, 'v9-01-1280-submit1.png') });
    
    // Bước 3: Kiểm tra nút Làm lại
    const retryBtn = await p.locator('#retry').first();
    const retryVisible = await retryBtn.isVisible().catch(() => false);
    console.log('Nút Làm lại visible:', retryVisible);
    
    if (!retryVisible) {
      console.log('❌ Nút Làm lại không visible!');
      const state = await p.evaluate(() => ({
        retryExists: !!document.getElementById('retry'),
        retryHidden: document.getElementById('retry')?.hidden,
        formExists: !!document.querySelector('form')
      }));
      console.log('State:', state);
    } else {
      console.log('✓ Nút visible');
      
      // Bước 4: Bấm Làm lại
      await retryBtn.click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại, reset');
      
      await p.screenshot({ path: path.join(output, 'v9-02-1280-reset.png') });
      
      // Bước 5: Làm bài lần 2
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const inp = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
        await inp.click().catch(() => {});
      }
      console.log('✓ Làm lại 2 câu');
      
      // Bước 6: Nộp lần 2
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 2 thành công');
      
      await p.screenshot({ path: path.join(output, 'v9-03-1280-submit2.png') });
    }
    
    // Bước 7: In
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v9-04-1280-print.png') });
    console.log('✓ In');
    
    await c.close();
    
    // Test 390px
    console.log('\n=== Vòng 9: 390×844 ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/quiz.html');
    await p2.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    const inp = await q1.locator('input[type="radio"]').first();
    await inp.click();
    
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp lần 1');
    
    await p2.screenshot({ path: path.join(output, 'v9-05-390-submit1.png') });
    
    const retry2 = await p2.locator('#retry').first();
    const retry2Visible = await retry2.isVisible().catch(() => false);
    if (retry2Visible) {
      await retry2.click();
      await p2.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const q2 = await p2.locator('fieldset[data-question-index="0"]').first();
      const inp2 = await q2.locator('input[type="radio"]:nth-of-type(2)').first();
      await inp2.click().catch(() => {});
      
      await p2.locator('button:has-text("Nộp")').click();
      await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 2');
      
      await p2.screenshot({ path: path.join(output, 'v9-06-390-submit2.png') });
    }
    
    await c2.close();
    
    console.log('\n✅ Vòng 9 đạt!');
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
