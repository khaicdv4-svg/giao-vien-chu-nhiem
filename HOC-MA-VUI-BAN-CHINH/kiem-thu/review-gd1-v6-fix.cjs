'use strict';
// GĐ1 Vòng 6: Làm lại bài (fix: normalize fixture trước)
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
  const html_source = fs.readFileSync(path.resolve(app, 'review-html.js'), 'utf-8');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    console.log('=== GĐ1 Vòng 6: Làm lại bài (1280px) ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    p.on('pageerror', e => console.error('PAGE ERR:', e.message));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    // Render: gọi createPractice() để normalize, rồi renderHtml()
    const html = await p.evaluate(({raw, dom, html}) => {
      // Load domain + html modules
      const domain = (() => { let HmvReviewDomain; eval(dom); return HmvReviewDomain; })();
      const htmlMod = (() => { let HmvReviewHtml; eval(html); return HmvReviewHtml; })();
      
      // Normalize
      const attempt = domain.createPractice(raw);
      // Render
      return htmlMod.renderHtml(attempt, dom);
    }, {raw: fixture_data, dom: domain_source, html: html_source});
    
    await p.evaluate((h) => { document.body.innerHTML = h; }, html);
    await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Nộp lần 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const inp = await qs[i].locator('input[type="radio"]:first-of-type').first();
      try { await inp.click(); } catch (e) {}
    }
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp bài lần 1');
    
    await p.screenshot({ path: path.join(output, 'v6-01-ket-qua-lan1.png') });
    console.log('✓ Screenshot: v6-01-ket-qua-lan1.png');
    
    // Làm lại
    console.log('\n=== Làm lại bài ===');
    const retryVisible = await p.locator('#retry').isVisible();
    console.log('Nút retry visible:', retryVisible);
    
    if (retryVisible) {
      await p.locator('#retry').click();
      await p.waitForFunction(() => {
        const qs = document.querySelectorAll('fieldset[data-question-index]');
        return qs.length > 0 && !document.querySelector('[class*="result"]');
      }, { timeout: 5000 });
      console.log('✓ Bài được reset');
      
      // Nộp lần 2
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const inp = await qs2[i].locator('input[type="radio"]:first-of-type').first();
        try { await inp.click(); } catch (e) {}
      }
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp bài lần 2');
      
      await p.screenshot({ path: path.join(output, 'v6-02-ket-qua-lan2.png') });
      console.log('✓ Screenshot: v6-02-ket-qua-lan2.png');
    } else {
      console.log('⚠ Nút retry không visible');
    }
    
    // In
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v6-03-in.png') });
    console.log('✓ Screenshot: v6-03-in.png');
    
    await c.close();
    console.log('\n✅ GĐ1 Vòng 6 OK!');
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
