'use strict';
// Vòng 12 FINAL: HTML file qua HTTP (không file://) + Ghi log
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const temp_dir = path.resolve(__dirname, '../.temp-v12-final');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(temp_dir, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  const domain_src = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  
  console.log('=== Vòng 12 FINAL: HTML qua HTTP + Log ===\n');
  
  // Server HTTP - phục vụ HTML + app
  let html_string = '';
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    
    if (u.pathname === '/quiz.html' && html_string) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html_string);
    }
    
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
    console.log('Bước 1: Tạo HTML\n');
    const c_gen = await browser.newContext();
    const p_gen = await c_gen.newPage();
    
    await p_gen.goto(origin + '/');
    await p_gen.waitForLoadState('domcontentloaded');
    
    html_string = await p_gen.evaluate(({fixture, domain_src}) => {
      const attempt = window.HmvReviewHtml.createPractice(fixture);
      const html = window.HmvReviewHtml.renderHtml(attempt, domain_src);
      return html;
    }, {fixture: fixture_data, domain_src: domain_src});
    
    console.log('✓ HTML:', html_string.length, 'bytes');
    console.log('✓ Có form-action none:', html_string.includes("form-action 'none'") ? 'yes (CSP)' : 'no');
    
    await c_gen.close();
    
    console.log('\nBước 2: Mở HTML qua HTTP + Làm bài\n');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    
    await p.goto(origin + '/quiz.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML opened via HTTP');
    
    if (errors.length) console.log('⚠ Errors:', errors.slice(0, 3));
    
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Trước nộp
    const before = await p.evaluate(() => ({
      retryHidden: document.getElementById('retry')?.hidden
    }));
    console.log('Trước nộp: retryButton.hidden =', before.retryHidden);
    
    // Làm bài
    const qs = await p.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const radio = await qs[i].locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    // Nộp
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp bài');
    
    // Sau nộp
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({
      retryExists: !!document.getElementById('retry'),
      retryHidden: document.getElementById('retry')?.hidden
    }));
    
    console.log('Sau nộp: retryButton.hidden =', after.retryHidden);
    
    await p.screenshot({ path: path.join(output, 'v12-final-after.png') });
    
    if (after.retryExists && !after.retryHidden) {
      console.log('\n✅ NÚT LÀM LẠI HOẠT ĐỘNG!\n');
      
      await p.locator('#retry').click();
      await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const qs2 = await p.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const radio = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
        }
      }
      
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 2');
      
      await p.screenshot({ path: path.join(output, 'v12-final-submit2.png') });
      console.log('\n✅ GĐ1 HOÀN THÀNH!');
      
    } else {
      console.log('\n❌ Nút Làm lại hidden:', after.retryHidden);
      console.log('→ Nguyên nhân: retryButton.hidden = (attempt.status === "in-progress") || exhausted()');
      console.log('→ Status sau nộp phải là "graded", không phải "in-progress"');
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
