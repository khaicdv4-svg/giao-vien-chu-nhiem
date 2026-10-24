'use strict';
// Vòng 11: Debug log attempt.status trước/sau nộp
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const domain_path = path.resolve(app, 'review-domain.js');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  const domain_source = fs.readFileSync(domain_path, 'utf-8');
  
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/gen.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><head><script src="/review-domain.js"><\/script><script src="/review-html.js"><\/script></head><body><script>' +
        'window.FIXTURE=' + JSON.stringify(fixture_data) + ';' +
        'window.DOMAIN_SOURCE=' + JSON.stringify(domain_source) + ';' +
        'const att=window.HmvReviewHtml.createPractice(window.FIXTURE);' +
        'const html=window.HmvReviewHtml.renderHtml(att,window.DOMAIN_SOURCE);' +
        'document.body.innerHTML=html;' +
        '<\/script></body></html>');
    } else {
      t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
      if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(t, (e, d) => {
        const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(t)] || 'application/octet-stream';
        res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
        res.end(e ? '' : d);
      });
    }
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    console.log('=== Vòng 11: Debug Log ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    // Log console từ page
    p.on('console', msg => console.log('PAGE LOG:', msg.text()));
    p.on('pageerror', e => console.error('PAGE ERR:', e.message));
    
    await p.goto(origin + '/gen.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML loaded');
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Inject debug log
    await p.evaluate(() => {
      const origLog = console.log;
      window.debugLog = [];
      window.log = (msg) => {
        window.debugLog.push(msg);
        origLog('DEBUG:', msg);
      };
    });
    
    // Trước nộp
    const status_before = await p.evaluate(() => {
      // Cố truy cập attempt qua scope
      try {
        return window.HmvReviewHtml?.createPractice(window.FIXTURE)?.status || 'unknown';
      } catch (e) {
        return 'error: ' + e.message;
      }
    });
    console.log('Status before submit (via createPractice):', status_before);
    
    // Làm bài
    const qs = await p.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const radio = await qs[i].locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    console.log('✓ Answered 2 questions');
    
    // Nộp - inject log trước
    await p.evaluate(() => {
      // Wrap submitAttempt nếu có
      const origSubmit = window.HmvReviewDomain?.submitAttempt;
      if (origSubmit) {
        window.HmvReviewDomain.submitAttempt = function(...args) {
          const result = origSubmit.apply(this, args);
          console.log('submitAttempt returned status:', result.status);
          return result;
        };
      }
    });
    
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    // Sau nộp
    await p.waitForTimeout(500); // Chờ JS cập nhật
    const state_after = await p.evaluate(() => {
      const retry = document.getElementById('retry');
      return {
        retryExists: !!retry,
        retryHidden: retry?.hidden,
        retryDisplay: retry?.style.display,
        debugLog: window.debugLog || []
      };
    });
    
    console.log('\n=== Trạng Thái Sau Nộp ===');
    console.log('Retry exists:', state_after.retryExists);
    console.log('Retry hidden:', state_after.retryHidden);
    console.log('Retry display:', state_after.retryDisplay);
    console.log('Debug logs:', state_after.debugLog);
    
    await p.screenshot({ path: path.join(output, 'v11-debug-after-submit.png') });
    
    await c.close();
    
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
