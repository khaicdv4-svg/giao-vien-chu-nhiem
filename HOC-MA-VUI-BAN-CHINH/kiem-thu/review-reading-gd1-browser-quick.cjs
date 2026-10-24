'use strict';
// Test GĐ1 nhanh: 1280×800 + fixture mới
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
  
  console.log('GĐ1 Test: Fixture mới +', fixture_data.questions.length, 'câu');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    p.on('pageerror', e => console.error('PAGE ERR:', e.message));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ Trang tải');
    
    const renderResult = await p.evaluate(({raw, dom}) => {
      try {
        if (window.HmvReviewHtml?.renderHtml) {
          const html = window.HmvReviewHtml.renderHtml(raw, dom);
          document.body.innerHTML = html;
          return {ok: true, fieldsets: document.querySelectorAll('fieldset[data-question-index]').length};
        }
        return {ok: false, err: 'HmvReviewHtml not found'};
      } catch (e) {
        return {ok: false, err: e.message};
      }
    }, {raw: fixture_data, dom: domain_source});
    
    if (!renderResult.ok) {
      console.error('❌ renderHtml:', renderResult.err);
      process.exit(1);
    }
    
    console.log('✓ renderHtml OK, fieldsets:', renderResult.fieldsets);
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    await p.screenshot({ path: path.join(output, 'gd1-lam-bai-1280.png') });
    console.log('✓ Screenshot: lam-bai-1280.png');
    
    // Làm 3 câu
    const qs = await p.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(3, qs.length); i++) {
      const inp = await qs[i].locator('textarea, input[type="radio"]:first-of-type, input[type="text"]').first();
      const t = await inp.getAttribute('type').catch(() => '');
      if (t === 'radio') await inp.click();
      else await inp.fill(`Đáp án ${i+1}`);
    }
    console.log('✓ Làm 3 câu');
    
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp');
    
    await p.screenshot({ path: path.join(output, 'gd1-ket-qua-1280.png') });
    console.log('✓ Screenshot: ket-qua-1280.png');
    
    console.log('\n✅ GĐ1 test thành công!');
    console.log('Output:', output);
    fs.readdirSync(output).forEach(f => console.log('  ' + f));
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
