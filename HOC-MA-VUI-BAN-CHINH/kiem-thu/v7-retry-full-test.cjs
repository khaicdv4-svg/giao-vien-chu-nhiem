'use strict';
// Vòng 7 A: Mở HTML hoàn chỉnh qua HTTP + Chromium
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  
  // Server phục vụ app
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
    console.log('=== Vòng 7 A: Nộp bài + kiểm tra Làm lại ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    p.on('pageerror', e => console.error('PAGE ERR:', e.message));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    // Render bài
    const html = await p.evaluate(({raw, dom}) => window.HmvReviewHtml.renderHtml(raw, dom), {raw: fixture_data, dom: domain_source});
    await p.evaluate((h) => { document.body.innerHTML = h; }, html);
    await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Nộp lần 1
    const q1 = await p.locator('fieldset[data-question-index="0"]').first();
    const inp = await q1.locator('input[type="radio"]').first();
    await inp.click();
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp bài lần 1');
    
    // Kiểm tra nút Làm lại
    await p.waitForTimeout(500); // Chờ JS cập nhật
    const retryCheck = await p.evaluate(() => {
      const btn = document.getElementById('retry');
      return {
        exists: !!btn,
        hidden: btn?.hidden,
        display: btn?.style.display,
        parentHtml: btn?.parentElement?.innerHTML?.substring(0, 100)
      };
    });
    
    console.log('\n=== Kiểm tra nút Làm lại ===');
    console.log('Tồn tại:', retryCheck.exists);
    console.log('Hidden:', retryCheck.hidden);
    console.log('Display:', retryCheck.display);
    console.log('Parent HTML:', retryCheck.parentHtml);
    
    if (retryCheck.exists && !retryCheck.hidden && retryCheck.display !== 'none') {
      console.log('✓ Nút visible, bấm Làm lại...');
      await p.locator('#retry').click();
      await p.waitForFunction(() => {
        const qs = document.querySelectorAll('fieldset[data-question-index]');
        return qs.length > 0 && !document.querySelector('[class*="result"]');
      }, { timeout: 5000 });
      console.log('✓ Bài reset, làm lần 2');
      
      // Nộp lần 2
      const q2 = await p.locator('fieldset[data-question-index="0"]').first();
      const inp2 = await q2.locator('input[type="radio"]:nth-of-type(2)').first();
      await inp2.click();
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp bài lần 2 thành công');
      
      await p.screenshot({ path: path.join(output, 'v7-lam-lai-thanh-cong.png') });
      console.log('✓ Screenshot: v7-lam-lai-thanh-cong.png');
    } else {
      console.log('❌ Nút không visible, NGUYÊN NHÂN CẦN KIỂM TRA');
      console.log('Log DOM:');
      const dom = await p.evaluate(() => {
        const form = document.querySelector('form');
        return {
          formExists: !!form,
          submitPanelHtml: document.querySelector('.submit-panel')?.innerHTML?.substring(0, 300)
        };
      });
      console.log(JSON.stringify(dom, null, 2));
    }
    
    await c.close();
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
