'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-tiengviet4-doc-hieu.json');
const app = path.resolve(__dirname, '../app');

console.log('DEBUG: Tải fixture và xem lỗi');

(async () => {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  console.log('Server:', origin);
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(5000);
    
    // In tất cả console
    p.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
    p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
    
    console.log('\n1. Vào trang...');
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ Trang tải');
    
    console.log('\n2. Mở UI...');
    const opened = await p.evaluate(() => {
      if (window.HmvReviewUI) {
        window.HmvReviewUI.open();
        return 'opened';
      }
      return 'not found';
    });
    console.log('Result:', opened);
    
    console.log('\n3. Chờ #rv-import...');
    await p.locator('#rv-import').waitFor({ state: 'attached', timeout: 3000 });
    console.log('✓ #rv-import hiện');
    
    console.log('\n4. Tải fixture:', fixture);
    await p.locator('#rv-import').setInputFiles(fixture);
    console.log('✓ setInputFiles');
    
    console.log('\n5. Chờ fieldset...');
    const count = await p.evaluate(() => document.querySelectorAll('fieldset[data-question-index]').length);
    console.log('Count:', count);
    
    if (count === 0) {
      console.log('\n6. Debug: chuỗi HTML...');
      const html = await p.content();
      if (html.includes('fieldset')) console.log('HTML có fieldset');
      if (html.includes('data-question-index')) console.log('HTML có data-question-index');
      if (html.includes('Cuộc phiêu lưu')) console.log('HTML có nội dung bài');
    }
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
