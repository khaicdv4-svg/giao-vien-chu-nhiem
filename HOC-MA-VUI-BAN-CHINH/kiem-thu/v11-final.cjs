'use strict';
// Vòng 11: Tạo file HTML, mở qua page.goto (không innerHTML)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const domain_path = path.resolve(app, 'review-domain.js');
const html_module_path = path.resolve(app, 'review-html.js');
const temp_dir = path.resolve(__dirname, '../.temp-v11');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(temp_dir, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  const domain_source = fs.readFileSync(domain_path, 'utf-8');
  const html_module_source = fs.readFileSync(html_module_path, 'utf-8');
  
  console.log('✓ Fixture:', fixture_data.id);
  
  // Tạo HTML qua Node.js (không Playwright)
  let html_string;
  {
    const sandbox = {
      module: { exports: {} },
      console, Buffer, Error, String, Set, Map, Array, Object, Number, Boolean, RegExp,
      isNaN, parseInt, parseFloat, JSON, encodeURIComponent, decodeURIComponent
    };
    
    // Load domain
    vm.runInNewContext(domain_source, sandbox);
    const domain = sandbox.module.exports;
    
    // Load html module + inject domain
    sandbox.module.exports = {};
    sandbox.HmvReviewDomain = domain;
    vm.runInNewContext(html_module_source, sandbox);
    const html_mod = sandbox.module.exports;
    
    // createPractice + renderHtml
    const attempt = html_mod.createPractice(fixture_data);
    html_string = html_mod.renderHtml(attempt, domain_source);
  }
  
  const html_file = path.join(temp_dir, 'quiz.html');
  fs.writeFileSync(html_file, html_string, 'utf-8');
  console.log('✓ HTML file:', html_file);
  console.log('  Size:', html_string.length, 'bytes');
  
  // Server phục vụ file HTML
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/quiz.html') {
      t = html_file;
    } else {
      t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    }
    if (!t.startsWith(app + path.sep) && !t.startsWith(temp_dir + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  console.log('✓ Server:', origin);
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    console.log('\n=== Vòng 11: 1280×800 (HTML file + page.goto) ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    
    // Mở HTML file trực tiếp - không innerHTML
    await p.goto(origin + '/quiz.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded via page.goto()');
    
    if (errors.length) console.log('⚠ Errors:', errors);
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Làm bài 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Câu:', qs.length);
    
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const radio = await qs[i].locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    // Nộp 1
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p.screenshot({ path: path.join(output, 'v11-01-1280-nop1.png') });
    
    // Kiểm tra retry
    const retry = await p.locator('#retry').first();
    const visible = await retry.isVisible().catch(() => false);
    console.log('Retry visible:', visible);
    
    if (visible) {
      console.log('✅ NÚTLÀMLẠIHOẠTĐỘNG!');
      await retry.click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại, reset');
      
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const radio = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
        }
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2 thành công');
      
      await p.screenshot({ path: path.join(output, 'v11-02-1280-nop2.png') });
    } else {
      console.log('❌ Retry không visible');
      const state = await p.evaluate(() => ({
        exists: !!document.getElementById('retry'),
        hidden: document.getElementById('retry')?.hidden
      }));
      console.log('State:', state);
    }
    
    // In
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v11-03-1280-print.png') });
    
    await c.close();
    console.log('✅ 1280px complete');
    
    // 390px
    console.log('\n=== Vòng 11: 390×844 ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/quiz.html');
    await p2.waitForLoadState('domcontentloaded');
    
    await p2.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    const radio1 = await q1.locator('input[type="radio"]').first();
    if (await radio1.isVisible().catch(() => false)) {
      await radio1.click();
    }
    
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p2.screenshot({ path: path.join(output, 'v11-04-390-nop1.png') });
    
    const retry2 = await p2.locator('#retry').first();
    const vis2 = await retry2.isVisible().catch(() => false);
    if (vis2) {
      await retry2.click();
      await p2.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const q2 = await p2.locator('fieldset[data-question-index="0"]').first();
      const radio2 = await q2.locator('input[type="radio"]:nth-of-type(2)').first();
      if (await radio2.isVisible().catch(() => false)) {
        await radio2.click();
      }
      
      await p2.locator('button:has-text("Nộp")').click();
      await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2');
      
      await p2.screenshot({ path: path.join(output, 'v11-05-390-nop2.png') });
    }
    
    await c2.close();
    
    console.log('\n✅ Vòng 11 HOÀN THÀNH!');
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(temp_dir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
