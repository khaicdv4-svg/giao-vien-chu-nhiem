'use strict';
// Vòng 12: Tạo HTML file + page.goto() + Ghi log quyết định
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const temp_dir = path.resolve(__dirname, '../.temp-v12');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(temp_dir, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  
  console.log('=== Vòng 12: Tạo HTML + Ghi Log ===\n');
  
  // Server HTTP
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
    console.log('Bước 1: Tạo HTML qua Playwright\n');
    const c_gen = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p_gen = await c_gen.newPage();
    p_gen.setDefaultTimeout(10000);
    
    await p_gen.goto(origin + '/');
    await p_gen.waitForLoadState('domcontentloaded');
    
    // Render HTML
    const html_string = await p_gen.evaluate(({fixture, domain_src}) => {
      const attempt = window.HmvReviewHtml.createPractice(fixture);
      const html = window.HmvReviewHtml.renderHtml(attempt, domain_src);
      return html;
    }, {fixture: fixture_data, domain_src: fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8')});
    
    const html_file = path.join(temp_dir, 'quiz.html');
    fs.writeFileSync(html_file, html_string, 'utf-8');
    console.log('✓ HTML file tạo:', html_file);
    console.log('  Kích thước:', html_string.length, 'bytes');
    console.log('  Có <body>:', html_string.includes('<body') ? 'có' : 'không');
    console.log('  Có id="retry":', html_string.includes('id="retry"') ? 'có' : 'không');
    
    await c_gen.close();
    
    console.log('\nBước 2: Mở HTML file qua page.goto (không innerHTML)\n');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    const errors = [];
    const logs = [];
    p.on('console', msg => logs.push('LOG: ' + msg.text()));
    p.on('pageerror', e => errors.push('ERR: ' + e.message));
    
    // Inject instrumentation trước mở
    await p.addInitScript(() => {
      window.DEBUG_LOG = [];
      window.logDebug = (msg) => {
        window.DEBUG_LOG.push(msg);
        console.log('DEBUG:', msg);
      };
      
      // Wrap submitAttempt
      const origDomain = window.HmvReviewDomain;
      if (origDomain && origDomain.submitAttempt) {
        const origSubmit = origDomain.submitAttempt;
        window.HmvReviewDomain.submitAttempt = function(...args) {
          window.logDebug('submitAttempt called');
          const result = origSubmit.apply(this, args);
          window.logDebug('submitAttempt returned, status=' + result.status);
          return result;
        };
      }
    });
    
    // Mở HTML file - không innerHTML
    await p.goto('file://' + html_file);
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML opened via page.goto()');
    
    if (errors.length) console.log('⚠ Errors:', errors);
    
    // Kiểm tra form tồn tại
    const form_exists = await p.evaluate(() => !!document.querySelector('form'));
    console.log('✓ Form exists:', form_exists);
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    console.log('\nBước 3: Làm bài 1 + Nộp + Ghi Log\n');
    
    // Làm bài
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Câu hỏi:', qs.length);
    
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const radio = await qs[i].locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    // Trước nộp
    const before = await p.evaluate(() => ({
      retryExists: !!document.getElementById('retry'),
      retryHidden: document.getElementById('retry')?.hidden
    }));
    console.log('Trước nộp:');
    console.log('  - retryButton exists:', before.retryExists);
    console.log('  - retryButton.hidden:', before.retryHidden);
    
    // Nộp
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('\n✓ Nộp bài');
    
    // Sau nộp - collect chi tiết
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({
      retryExists: !!document.getElementById('retry'),
      retryHidden: document.getElementById('retry')?.hidden,
      retryDisplay: document.getElementById('retry')?.style.display,
      formExists: !!document.querySelector('form'),
      resultExists: !!document.querySelector('[class*="result"]'),
      debugLog: window.DEBUG_LOG || [],
      consoleLog: typeof logs !== 'undefined' ? logs : []
    }));
    
    console.log('\nSau nộp:');
    console.log('  - retryButton exists:', after.retryExists);
    console.log('  - retryButton.hidden:', after.retryHidden);
    console.log('  - retryButton.style.display:', after.retryDisplay || '(empty)');
    console.log('  - form exists:', after.formExists);
    console.log('  - result exists:', after.resultExists);
    console.log('  - debugLog:', after.debugLog);
    
    await p.screenshot({ path: path.join(output, 'v12-after-submit.png') });
    console.log('✓ Screenshot:', path.join(output, 'v12-after-submit.png'));
    
    if (after.retryExists && !after.retryHidden) {
      console.log('\n✅ NÚTLÀMLẠIHOẠTĐỘNG!\n');
      
      await p.locator('#retry').click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại, bài reset');
      
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const radio = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
        }
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 2 thành công');
      
      await p.screenshot({ path: path.join(output, 'v12-submit2.png') });
      console.log('✓ Screenshot:', path.join(output, 'v12-submit2.png'));
      
    } else {
      console.log('\n❌ Nút Làm lại không visible');
      console.log('\n>>> CẦN KIỂM TRA MÃ NGUỒN:');
      console.log('>>> review-html.js dòng 370: retryButton.hidden = attempt.status === "in-progress" || exhausted()');
      console.log('>>> review-domain.js dòng 27: finalize() set status = "graded" hoặc "pending-manual"');
      console.log('>>> Nhưng nút vẫn hidden → exhausted() có thể trả về true');
    }
    
    await c.close();
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(temp_dir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
