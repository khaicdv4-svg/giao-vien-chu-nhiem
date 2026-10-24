'use strict';
// GĐ1 Playwright: 1280px + 390px + in
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  
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
  const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  const domain_source = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    // Test 1280px
    console.log('=== GĐ1 Test 1280×800 ===');
    {
      const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      p.on('pageerror', e => console.error('PAGE ERR:', e.message));
      
      await p.goto(origin + '/');
      await p.waitForLoadState('domcontentloaded');
      
      const html = await p.evaluate(({raw, dom}) => window.HmvReviewHtml.renderHtml(raw, dom), {raw: fixture_data, dom: domain_source});
      await p.evaluate((h) => { document.body.innerHTML = h; }, html);
      await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
      
      const qs = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(3, qs.length); i++) {
        const inp = await qs[i].locator('textarea, input[type="radio"]:first-of-type, input[type="text"]').first();
        try { await inp.click(); } catch (e) {}
        try { await inp.fill(`Đáp án ${i+1}`); } catch (e) {}
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      
      await p.screenshot({ path: path.join(output, '01-gd1-lam-bai-1280.png') });
      console.log('✓ Screenshot: 01-gd1-lam-bai-1280.png');
      
      await p.screenshot({ path: path.join(output, '02-gd1-ket-qua-1280.png') });
      console.log('✓ Screenshot: 02-gd1-ket-qua-1280.png');
      
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: path.join(output, '03-gd1-in-1280.png') });
      console.log('✓ Screenshot: 03-gd1-in-1280.png');
      
      await c.close();
    }
    
    // Test 390px
    console.log('\n=== GĐ1 Test 390×844 ===');
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      
      await p.goto(origin + '/');
      await p.waitForLoadState('domcontentloaded');
      
      const html = await p.evaluate(({raw, dom}) => window.HmvReviewHtml.renderHtml(raw, dom), {raw: fixture_data, dom: domain_source});
      await p.evaluate((h) => { document.body.innerHTML = h; }, html);
      await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
      
      await p.screenshot({ path: path.join(output, '05-gd1-lam-bai-390.png') });
      console.log('✓ Screenshot: 05-gd1-lam-bai-390.png');
      
      const q1 = await p.locator('fieldset[data-question-index="0"]').first();
      const inp = await q1.locator('input[type="radio"]').first();
      await inp.click();
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      
      await p.screenshot({ path: path.join(output, '06-gd1-ket-qua-390.png') });
      console.log('✓ Screenshot: 06-gd1-ket-qua-390.png');
      
      await c.close();
    }
    
    console.log('\n✅ GĐ1 Playwright thành công!');
    console.log('Output:', output);
    fs.readdirSync(output).forEach(f => console.log('  ' + f));
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
