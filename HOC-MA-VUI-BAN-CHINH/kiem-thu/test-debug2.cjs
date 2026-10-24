'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-tiengviet4-doc-hieu.json');
const app = path.resolve(__dirname, '../app');

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
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(5000);
    p.on('console', msg => console.log('[' + msg.type() + ']', msg.text()));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    await p.evaluate(() => { if (window.HmvReviewUI) window.HmvReviewUI.open(); });
    await p.locator('#rv-import').waitFor({ state: 'attached' });
    
    // Gắn listener trước tải
    await p.evaluate(() => {
      const inp = document.getElementById('rv-import');
      inp.addEventListener('change', () => console.log('CHANGE fired'));
    });
    
    console.log('Tải fixture...');
    await p.locator('#rv-import').setInputFiles(fixture);
    
    // Chờ để xem có change event không
    await p.waitForTimeout(2000);
    
    // Kiểm tra có fieldset không
    const count = await p.evaluate(() => document.querySelectorAll('fieldset').length);
    console.log('Total fieldset:', count);
    
    const qcount = await p.evaluate(() => document.querySelectorAll('fieldset[data-question-index]').length);
    console.log('Question fieldset:', qcount);
    
    // Xem HTML đầu tiên
    const first = await p.evaluate(() => {
      const fs = document.querySelectorAll('fieldset');
      if (fs.length) return fs[0].className;
      return 'no fieldset';
    });
    console.log('First fieldset class:', first);
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => console.error(err.message));
