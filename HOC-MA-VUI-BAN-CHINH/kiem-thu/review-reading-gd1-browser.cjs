'use strict';
// Test GĐ1: renderHtml → làm bài → nộp → làm lại
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
  
  console.log('GĐ1 Browser:', fixture_data.questions.length, 'câu');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    // 1280
    {
      const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      
      await p.goto(origin + '/');
      await p.waitForLoadState('domcontentloaded');
      
      // Gọi renderHtml với fixture
      const renderResult = await p.evaluate(({raw, dom}) => {
        try {
          if (window.HmvReviewHtml?.renderHtml) {
            window.HmvReviewHtml.renderHtml(raw, dom);
            return {ok: true};
          }
          return {ok: false, err: 'HmvReviewHtml not found'};
        } catch (e) {
          return {ok: false, err: e.message};
        }
      }, {raw: fixture_data, dom: domain_source});
      
      if (!renderResult.ok) {
        console.error('renderHtml error:', renderResult.err);
        throw new Error('renderHtml failed: ' + renderResult.err);
      }
      
      await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
      console.log('✓ 1280: bài render,', await p.evaluate(() => document.querySelectorAll('fieldset').length), 'fieldset');
      
      await p.evaluate(() => { window.HMV_START = Date.now(); });
      await p.screenshot({ path: path.join(output, 'gd1-lam-bai-1280.png') });
      
      const qs = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(5, qs.length); i++) {
        const inp = await qs[i].locator('textarea, input[type="radio"]:first-of-type, input[type="text"]').first();
        const t = await inp.getAttribute('type').catch(() => '');
        if (t === 'radio') await inp.click();
        else await inp.fill(`Đáp án ${i+1}`);
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ 1280: nộp');
      
      await p.screenshot({ path: path.join(output, 'gd1-ket-qua-1280.png') });
      
      const start = await p.evaluate(() => window.HMV_START);
      const retry = p.locator('button:has-text("Làm lại"), button:has-text("🔁")');
      if (await retry.isVisible({ timeout: 1000 }).catch(() => false)) {
        await retry.click();
        const after = await p.evaluate(() => window.HMV_START);
        console.log('✓ 1280: làm lại', start === after ? '(no reload)' : '(reload!)');
      }
      
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: path.join(output, 'gd1-ban-in-1280.png') });
      console.log('✓ 1280: bản in');
      
      await c.close();
    }
    
    // 390
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      
      await p.goto(origin + '/');
      await p.waitForLoadState('domcontentloaded');
      // Gọi renderHtml với fixture
      const renderResult = await p.evaluate(({raw, dom}) => {
        try {
          if (window.HmvReviewHtml?.renderHtml) {
            window.HmvReviewHtml.renderHtml(raw, dom);
            return {ok: true};
          }
          return {ok: false, err: 'HmvReviewHtml not found'};
        } catch (e) {
          return {ok: false, err: e.message};
        }
      }, {raw: fixture_data, dom: domain_source});
      
      if (!renderResult.ok) {
        console.error('renderHtml error:', renderResult.err);
        throw new Error('renderHtml failed: ' + renderResult.err);
      }
      await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
      
      await p.screenshot({ path: path.join(output, 'gd1-lam-bai-390.png') });
      
      const qs = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(5, qs.length); i++) {
        const inp = await qs[i].locator('textarea, input[type="radio"]:first-of-type, input[type="text"]').first();
        const t = await inp.getAttribute('type').catch(() => '');
        if (t === 'radio') await inp.click();
        else await inp.fill(`Đáp án ${i+1}`);
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      await p.screenshot({ path: path.join(output, 'gd1-ket-qua-390.png') });
      
      const retry = p.locator('button:has-text("Làm lại"), button:has-text("🔁")');
      if (await retry.isVisible({ timeout: 1000 }).catch(() => false)) {
        await retry.click();
      }
      
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: path.join(output, 'gd1-ban-in-390.png') });
      console.log('✓ 390: xong');
      
      await c.close();
    }
    
    console.log('\n✅ GĐ1 test xong');
    console.log('Output:', output);
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
