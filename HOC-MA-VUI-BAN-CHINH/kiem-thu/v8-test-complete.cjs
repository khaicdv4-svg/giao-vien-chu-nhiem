'use strict';
// Vòng 8 A: Tạo HTML từ renderHtml, mở qua HTTP, kiểm tra retry
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const tempDir = path.resolve(__dirname, '../.temp-html');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
  // Bước 1: Tạo HTML từ fixture + renderHtml()
  const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  const domain_src = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  const html_src = fs.readFileSync(path.resolve(app, 'review-html.js'), 'utf-8');
  
  // Khởi tạo domain + html module
  let domain, htmlMod;
  {
    const sandbox = { module: { exports: {} }, console, Buffer };
    vm.runInNewContext(domain_src, sandbox);
    domain = sandbox.module.exports;
    
    sandbox.module.exports = {};
    vm.runInNewContext(html_src, sandbox);
    htmlMod = sandbox.module.exports;
  }
  
  // Tạo attempt từ fixture
  const attempt = domain.createPractice(fixture_data);
  
  // Tạo HTML
  const htmlString = htmlMod.renderHtml(attempt, domain_src);
  
  // Ghi HTML vào file tạm
  const htmlFile = path.join(tempDir, 'test.html');
  fs.writeFileSync(htmlFile, htmlString, 'utf-8');
  console.log('✓ HTML tạo, kích thước:', htmlString.length, 'bytes');
  
  // Bước 2: Server phục vụ HTML + tài nguyên
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let t;
    if (u.pathname === '/test.html') {
      t = htmlFile;
    } else {
      t = path.resolve(app, '.' + decodeURIComponent(u.pathname));
    }
    if (!t.startsWith(app + path.sep) && !t.startsWith(tempDir + path.sep)) { res.writeHead(403); return res.end(); }
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
    // Bước 3: Test 1280px
    console.log('\n=== Vòng 8 A: 1280×800 ===');
    {
      const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      let errors = [];
      p.on('pageerror', e => errors.push('PAGE ERR: ' + e.message));
      
      // Mở HTML qua page.goto() — không dùng innerHTML
      await p.goto(origin + '/test.html');
      await p.waitForLoadState('domcontentloaded');
      console.log('✓ HTML tải');
      
      if (errors.length) console.log('⚠ Errors:', errors);
      
      // Làm bài lần 1
      const qs = await p.locator('fieldset[data-question-index]').all();
      console.log('Số câu:', qs.length);
      
      for (let i = 0; i < Math.min(2, qs.length); i++) {
        const inp = await qs[i].locator('input[type="radio"]').first();
        await inp.click();
      }
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 1');
      
      await p.screenshot({ path: path.join(output, 'v8-01-ket-qua-1280.png') });
      
      // Kiểm tra Làm lại
      const retryState = await p.evaluate(() => {
        const btn = document.getElementById('retry');
        return { exists: !!btn, hidden: btn?.hidden };
      });
      
      if (retryState.exists && !retryState.hidden) {
        await p.locator('#retry').click();
        await p.waitForFunction(() => !document.querySelector('[class*="result"]'), { timeout: 5000 });
        console.log('✓ Làm lại, reset');
        
        // Nộp lần 2
        const qs2 = await p.locator('fieldset[data-question-index]').all();
        const inp2 = await qs2[0].locator('input[type="radio"]:nth-of-type(2)').first();
        await inp2.click();
        await p.locator('button:has-text("Nộp")').click();
        await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
        console.log('✓ Nộp lần 2');
        
        await p.screenshot({ path: path.join(output, 'v8-02-lan2-1280.png') });
      } else {
        console.log('❌ Nút Làm lại không visible');
      }
      
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: path.join(output, 'v8-03-in-1280.png') });
      
      await c.close();
    }
    
    // Bước 4: Test 390px
    console.log('\n=== Vòng 8 A: 390×844 ===');
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const p = await c.newPage();
      p.setDefaultTimeout(10000);
      
      await p.goto(origin + '/test.html');
      await p.waitForLoadState('domcontentloaded');
      console.log('✓ HTML tải');
      
      const q1 = await p.locator('fieldset[data-question-index="0"]').first();
      const inp = await q1.locator('input[type="radio"]').first();
      await inp.click();
      await p.locator('button:has-text("Nộp")').click();
      await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
      console.log('✓ Nộp lần 1');
      
      await p.screenshot({ path: path.join(output, 'v8-04-ket-qua-390.png') });
      
      await c.close();
    }
    
    console.log('\n✅ Vòng 8 A hoàn thành!');
    console.log('Ảnh lưu:', fs.readdirSync(output).filter(f => f.startsWith('v8-')).join(', '));
    
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
