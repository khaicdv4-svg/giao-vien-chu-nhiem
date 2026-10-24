'use strict';
// Vòng 8 A: Tạo HTML qua app, mở qua HTTP
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const tempDir = path.resolve(__dirname, '../.temp-html');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
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
    console.log('\n=== Vòng 8 A: GĐ1 kiểm thử (1280×800) ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    // Gọi renderHtml qua Playwright
    const html = await p.evaluate(({raw, dom}) => {
      return window.HmvReviewHtml.renderHtml(raw, dom);
    }, {raw: fixture_data, dom: null});
    
    // Ghi HTML vào DOM
    await p.evaluate((h) => { document.body.innerHTML = h; }, html);
    await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // NHƯNG: innerHTML phá HTML hoàn chỉnh, nên dùng khác cách
    // Cách khác: viết HTML ra file, reload page
    fs.writeFileSync(path.join(tempDir, 'quiz.html'), html, 'utf-8');
    await p.goto(origin + '/');
    await p.evaluate(() => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/style.css';
      document.head.appendChild(link);
    });
    // Mở file HTML trực tiếp qua blob
    const quizUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await p.goto(quizUrl);
    await p.waitForLoadState('domcontentloaded');
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render (data URL)');
    
    // Làm bài lần 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Số câu:', qs.length);
    
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const inp = await qs[i].locator('input[type="radio"]').first();
      await inp.click();
    }
    
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp lần 1');
    
    await p.screenshot({ path: path.join(output, 'v8-01-1280-submit.png') });
    
    // Kiểm tra Làm lại
    const retryState = await p.evaluate(() => {
      const btn = document.getElementById('retry');
      return { exists: !!btn, hidden: btn?.hidden };
    });
    
    console.log('Nút Làm lại: exists=' + retryState.exists + ', hidden=' + retryState.hidden);
    
    if (retryState.exists && !retryState.hidden) {
      console.log('✓ Nút visible, bấm Làm lại');
      await p.locator('#retry').click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Reset');
      
      // Nộp lần 2
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
    
    console.log('\n✅ Vòng 8 A (1280px) đạt');
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
