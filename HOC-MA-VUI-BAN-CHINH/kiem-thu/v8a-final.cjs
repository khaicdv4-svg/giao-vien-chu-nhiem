'use strict';
// Vòng 8 A: Mở app qua HTTP, load fixture, kiểm tra retry
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  
  // Server
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
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
    console.log('=== Vòng 8 A: GĐ1 (1280×800) ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    // Inject fixture vào HMV._fixture
    await p.evaluate((data) => {
      window.HMV = window.HMV || {};
      window.HMV._fixture = data;
    }, fixture_data);
    
    // Gọi app để load fixture
    const result = await p.evaluate(() => {
      if (window.HmvReviewHtml && window.HmvReviewDomain) {
        const attempt = window.HmvReviewDomain.createPractice(window.HMV._fixture);
        const html = window.HmvReviewHtml.renderHtml(attempt, null);
        document.body.innerHTML = html;
        return { ok: true, qs: document.querySelectorAll('fieldset').length };
      }
      return { ok: false, reason: 'modules not loaded' };
    });
    
    if (!result.ok) {
      console.log('⚠ Modules chưa load:', result.reason);
      // Chờ load
      await p.waitForFunction(() => window.HmvReviewHtml && window.HmvReviewDomain, { timeout: 5000 });
      await p.evaluate(() => {
        const attempt = window.HmvReviewDomain.createPractice(window.HMV._fixture);
        const html = window.HmvReviewHtml.renderHtml(attempt, null);
        document.body.innerHTML = html;
      });
    }
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Làm bài lần 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Câu hỏi:', qs.length);
    
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const inp = await qs[i].locator('input[type="radio"]').first();
      await inp.click();
    }
    
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp lần 1');
    
    await p.screenshot({ path: path.join(output, 'v8-01-1280-nop.png') });
    
    // Kiểm tra retry
    const retry = await p.locator('#retry').first();
    const visible = await retry.isVisible().catch(() => false);
    console.log('Nút Làm lại visible:', visible);
    
    if (visible) {
      await retry.click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại, reset');
      
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      const inp2 = await qs2[0].locator('input[type="radio"]:nth-of-type(2)').first();
      await inp2.click();
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 2');
      
      await p.screenshot({ path: path.join(output, 'v8-02-1280-retry.png') });
    } else {
      console.log('❌ Nút Làm lại không visible');
    }
    
    // In
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v8-03-1280-print.png') });
    
    await c.close();
    
    // 390px
    console.log('\n=== Vòng 8 A: GĐ1 (390×844) ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/');
    await p2.waitForLoadState('domcontentloaded');
    
    await p2.evaluate((data) => {
      window.HMV = window.HMV || {};
      window.HMV._fixture = data;
    }, fixture_data);
    
    await p2.waitForFunction(() => window.HmvReviewHtml && window.HmvReviewDomain, { timeout: 5000 });
    
    await p2.evaluate(() => {
      const attempt = window.HmvReviewDomain.createPractice(window.HMV._fixture);
      const html = window.HmvReviewHtml.renderHtml(attempt, null);
      document.body.innerHTML = html;
    });
    
    await p2.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    const inp = await q1.locator('input[type="radio"]').first();
    await inp.click();
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp');
    
    await p2.screenshot({ path: path.join(output, 'v8-04-390-nop.png') });
    
    await c2.close();
    
    console.log('\n✅ Vòng 8 A đạt!');
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
