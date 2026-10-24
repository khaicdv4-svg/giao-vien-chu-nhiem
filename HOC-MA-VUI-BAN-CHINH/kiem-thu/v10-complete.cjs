'use strict';
// Vòng 10 FINAL: GĐ1 - renderHtml + file HTML + page.goto()
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const domain_path = path.resolve(app, 'review-domain.js');
const temp_dir = path.resolve(__dirname, '../.temp-v10-final');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(temp_dir, { recursive: true });
  
  const fixture_data = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  const domain_source = fs.readFileSync(domain_path, 'utf-8');
  
  console.log('✓ Fixture:', fixture_data.id);
  console.log('✓ domainSource:', domain_source.length, 'bytes');
  
  // Server
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/gen.html') {
      // Tạo HTML trên-the-fly
      t = null; // Will handle specially
    } else {
      t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    }
    
    if (t === null) {
      // Generate HTML qua Playwright context
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><head><script src="/review-domain.js"><\/script><script src="/review-html.js"><\/script></head><body><script>' +
        'window.FIXTURE=' + JSON.stringify(fixture_data) + ';' +
        'window.DOMAIN_SOURCE=' + JSON.stringify(domain_source) + ';' +
        'const att=window.HmvReviewHtml.createPractice(window.FIXTURE);' +
        'const html=window.HmvReviewHtml.renderHtml(att,window.DOMAIN_SOURCE);' +
        'document.body.innerHTML=html;' +
        '<\/script></body></html>');
    } else if (!t.startsWith(app + path.sep)) {
      res.writeHead(403);
      res.end();
    } else {
      fs.readFile(t, (e, d) => {
        const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(t)] || 'application/octet-stream';
        res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
        res.end(e ? '' : d);
      });
    }
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  console.log('✓ Server:', origin);
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    console.log('\n=== Vòng 10 FINAL: 1280×800 ===');
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    
    // page.goto thay vì innerHTML
    await p.goto(origin + '/gen.html');
    await p.waitForLoadState('domcontentloaded');
    console.log('✓ HTML generated + loaded');
    
    if (errors.length) console.log('⚠ Errors:', errors);
    
    // Chờ fieldset render
    await p.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    // Làm bài 1
    const qs = await p.locator('fieldset[data-question-index]').all();
    console.log('Câu:', qs.length);
    
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const q = qs[i];
      const radio = await q.locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    // Nộp 1
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p.screenshot({ path: path.join(output, 'v10-01-1280-nop1.png') });
    
    // Retry
    const retry = await p.locator('#retry').first();
    const visible = await retry.isVisible().catch(() => false);
    console.log('Retry visible:', visible);
    
    if (visible) {
      await retry.click();
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
      console.log('✓ Nộp 2 thành công!');
      
      await p.screenshot({ path: path.join(output, 'v10-02-1280-nop2.png') });
      console.log('✅ GĐ1 Làm lại HOẠT ĐỘNG!');
    } else {
      console.log('❌ Retry không visible (innerHTML lại phá form)');
    }
    
    // In
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(output, 'v10-03-1280-print.png') });
    
    await c.close();
    
    // 390px
    console.log('\n=== Vòng 10 FINAL: 390×844 ===');
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(10000);
    
    await p2.goto(origin + '/gen.html');
    await p2.waitForLoadState('domcontentloaded');
    
    await p2.waitForFunction(() => document.querySelectorAll('fieldset').length > 0, { timeout: 5000 });
    console.log('✓ Bài render');
    
    const q1 = await p2.locator('fieldset[data-question-index="0"]').first();
    const radio1 = await q1.locator('input[type="radio"]').first();
    if (await radio1.isVisible().catch(() => false)) {
      await radio1.click();
    }
    
    await p2.locator('button:has-text("Nộp")').click();
    await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    console.log('✓ Nộp 1');
    
    await p2.screenshot({ path: path.join(output, 'v10-04-390-nop1.png') });
    
    const retry2 = await p2.locator('#retry').first();
    const vis2 = await retry2.isVisible().catch(() => false);
    if (vis2) {
      await retry2.click();
      await p2.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Làm lại');
      
      const q2 = await p2.locator('fieldset[data-question-index="0"]').first();
      const radio2 = await q2.locator('input[type="radio"]:nth-of-type(2)').first();
      if (await radio2.isVisible().catch(() => false)) {
        await radio2.click();
      }
      
      await p2.locator('button:has-text("Nộp")').click();
      await p2.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp 2');
      
      await p2.screenshot({ path: path.join(output, 'v10-05-390-nop2.png') });
    }
    
    await c2.close();
    
    console.log('\n✅✅✅ VÒNG 10 HOÀN THÀNH! ✅✅✅');
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(temp_dir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
