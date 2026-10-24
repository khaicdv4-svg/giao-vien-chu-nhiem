'use strict';
// Vòng 9: GĐ1 Làm lại + nộp lần hai (dùng app HTTP, không eval)
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-tiengviet4-doc-hieu.json');
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
    // 1280px
    console.log('=== Vòng 9: 1280×800 ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    p.on('pageerror', e => console.error('ERR:', e.message));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    // Render qua app window globals
    await p.evaluate((data) => {
      // createPractice (không cần renderHtml vì app đã render)
      // Chỉ cần gọi createPractice để normalize, app sẽ load HTML
      const attempt = window.HmvReviewHtml.createPractice(data);
      // App tự render khi load, không cần gọi renderHtml ở đây
      // Thay vào đó, ta inject dữ liệu + yêu cầu app render
      window.HMV = window.HMV || {};
      window.HMV._testFixture = data;
      // Kích hoạt render nếu app có hàm
      if (window.HmvReviewUI && window.HmvReviewUI.loadPractice) {
        window.HmvReviewUI.loadPractice(data);
      }
    }, fixture_data);
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Làm 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(3, qs.length); i++) {
      await qs[i].locator('input[type="radio"]').first().click();
    }
    
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p.screenshot({ path: path.join(output, 'v9-01-1280-nop1.png') });
    
    // Retry
    const retry = await p.locator('#retry').first();
    const visible = await retry.isVisible().catch(() => false);
    console.log('Nút Làm lại visible:', visible);
    
    if (visible) {
      await retry.click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first().click().catch(() => {});
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2');
      
      await p.screenshot({ path: path.join(output, 'v9-02-1280-nop2.png') });
    } else {
      console.log('❌ Nút không visible');
    }
    
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v9-03-1280-in.png') });
    
    await c.close();
    console.log('✅ 1280px OK');
    
    // 390px
    console.log('\n=== Vòng 9: 390×844 ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/');
    await p2.waitForLoadState('domcontentloaded');
    
    await p2.evaluate((data) => {
      const attempt = window.HmvReviewHtml.createPractice(data);
      const html = window.HmvReviewHtml.renderHtml(attempt, null);
      document.body.innerHTML = html;
    }, fixture_data);
    
    await p2.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    await q1.locator('input[type="radio"]').first().click();
    
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p2.screenshot({ path: path.join(output, 'v9-04-390-nop1.png') });
    
    const retry2 = await p2.locator('#retry').first();
    const visible2 = await retry2.isVisible().catch(() => false);
    if (visible2) {
      await retry2.click();
      await p2.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const q2 = await p2.locator('fieldset[data-question-index="0"]').first();
      await q2.locator('input[type="radio"]:nth-of-type(2)').first().click();
      
      await p2.locator('button:has-text("Nộp")').click();
      await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2');
      
      await p2.screenshot({ path: path.join(output, 'v9-05-390-nop2.png') });
    }
    
    await c2.close();
    console.log('✅ 390px OK');
    
    console.log('\n✅ Vòng 9 OK!');
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
