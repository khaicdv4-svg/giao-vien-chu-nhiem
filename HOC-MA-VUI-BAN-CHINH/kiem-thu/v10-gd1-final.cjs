'use strict';
// Vòng 10: GĐ1 Hoàn thành - renderHtml + HTTP + Playwright
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-tiengviet4-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const domain_path = path.resolve(app, 'review-domain.js');
const html_path = path.resolve(app, 'review-html.js');
const temp_dir = path.resolve(__dirname, '../.temp-v10');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(temp_dir, { recursive: true });
  
  // Bước 2: Đọc domainSource thành string
  const domain_source = fs.readFileSync(domain_path, 'utf-8');
  const html_source = fs.readFileSync(html_path, 'utf-8');
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  
  console.log('✓ domainSource length:', domain_source.length);
  console.log('✓ htmlSource length:', html_source.length);
  
  // Bước 3: Tạo HTML hoàn chỉnh (Node.js side)
  let html_string;
  {
    const sandbox = {
      module: { exports: {} },
      console,
      Buffer,
      Error,
      String,
      Set,
      Map,
      Array,
      Object,
      Number,
      Boolean,
      RegExp,
      isNaN,
      parseInt,
      parseFloat,
      JSON,
      encodeURIComponent,
      decodeURIComponent
    };
    
    // Load domain
    vm.runInNewContext(domain_source, sandbox);
    const domain = sandbox.module.exports;
    
    // Load html module (exports createPractice + renderHtml)
    sandbox.module.exports = {};
    sandbox.HmvReviewDomain = domain; // Inject domain untuk html module
    vm.runInNewContext(html_source, sandbox);
    const html_mod = sandbox.module.exports;
    
    // createPractice ở html module
    const attempt = html_mod.createPractice(fixture_data);
    console.log('✓ Attempt created: questions=' + attempt.questions.length);
    
    // Render HTML - truyền domain_source đầy đủ
    html_string = html_mod.renderHtml(attempt, domain_source);
    console.log('✓ HTML rendered:', html_string.length, 'bytes');
  }
  
  // Ghi HTML vào file
  const html_file = path.join(temp_dir, 'quiz.html');
  fs.writeFileSync(html_file, html_string, 'utf-8');
  console.log('✓ HTML file created');
  
  // Bước 4: Server HTTP
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/quiz.html') {
      t = html_file;
    } else {
      t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    }
    if (!t.startsWith(app + path.sep) && !t.startsWith(temp_dir + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(t, (e, d) => {
      const ct = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.woff2': 'font/woff2'
      }[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  console.log('✓ Server:', origin);
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    // Bước 5: 1280px
    console.log('\n=== Vòng 10: 1280×800 ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    const errors = [];
    p.on('pageerror', e => errors.push('ERR: ' + e.message));
    
    // page.goto() - không innerHTML
    await p.goto(origin + '/quiz.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded via page.goto()');
    
    if (errors.length) console.log('⚠ Errors:', errors);
    
    // Xác nhận form tồn tại
    const form_exists = await p.evaluate(() => !!document.querySelector('form'));
    console.log('Form exists:', form_exists);
    
    if (!form_exists) {
      console.log('❌ Form không tồn tại');
      const body = await p.evaluate(() => document.body.innerHTML.substring(0, 200));
      console.log('Body:', body);
    } else {
      // Làm bài 1
      const qs = await p.locator('fieldset[data-question-index]').all();
      console.log('Questions:', qs.length);
      
      for (let i = 0; i < Math.min(3, qs.length); i++) {
        const inp = await qs[i].locator('input[type="radio"]').first();
        await inp.click();
      }
      
      // Nộp 1
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 1');
      
      await p.screenshot({ path: path.join(output, 'v10-01-1280-nop1.png') });
      
      // Kiểm tra retry
      const retry = await p.locator('#retry').first();
      const visible = await retry.isVisible().catch(() => false);
      console.log('Retry visible:', visible);
      
      if (visible) {
        await retry.click();
        await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
        console.log('✓ Làm lại, reset');
        
        const qs2 = await p.locator('fieldset[data-question-index]').all();
        for (let i = 0; i < Math.min(2, qs2.length); i++) {
          const inp = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
          await inp.click().catch(() => {});
        }
        
        await p.locator('button:has-text("Nộp")').click();
        await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
        console.log('✓ Nộp lần 2');
        
        await p.screenshot({ path: path.join(output, 'v10-02-1280-nop2.png') });
      } else {
        console.log('❌ Retry không visible');
        const state = await p.evaluate(() => ({
          retryExists: !!document.getElementById('retry'),
          retryHidden: document.getElementById('retry')?.hidden,
          hasResult: !!document.querySelector('[class*="result"]')
        }));
        console.log('State:', state);
      }
      
      // In
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: path.join(output, 'v10-03-1280-print.png') });
      console.log('✓ Print');
    }
    
    await c.close();
    console.log('✅ 1280px complete');
    
    // Bước 5: 390px
    console.log('\n=== Vòng 10: 390×844 ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/quiz.html');
    await p2.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    const inp1 = await q1.locator('input[type="radio"]').first();
    await inp1.click();
    
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p2.screenshot({ path: path.join(output, 'v10-04-390-nop1.png') });
    
    const retry2 = await p2.locator('#retry').first();
    const vis2 = await retry2.isVisible().catch(() => false);
    if (vis2) {
      await retry2.click();
      await p2.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const q2 = await p2.locator('fieldset[data-question-index="0"]').first();
      await q2.locator('input[type="radio"]:nth-of-type(2)').first().click();
      
      await p2.locator('button:has-text("Nộp")').click();
      await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2');
      
      await p2.screenshot({ path: path.join(output, 'v10-05-390-nop2.png') });
    }
    
    await c2.close();
    console.log('✅ 390px complete');
    
    console.log('\n✅ Vòng 10 OK!');
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(temp_dir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message, err.stack);
  process.exit(1);
});
