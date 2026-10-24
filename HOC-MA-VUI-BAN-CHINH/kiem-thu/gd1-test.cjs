'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture_path = path.resolve(__dirname, 'fixtures/review-combined4.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const fixture = JSON.parse(fs.readFileSync(fixture_path, 'utf-8'));
  const domain_src = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  
  console.log('=== GĐ1: Test Retry Button ===\n');
  
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let file = u.pathname === '/' ? '/index.html' : u.pathname;
    const t = path.resolve(app, '.' + decodeURIComponent(file));
    if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'}[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, {'Content-Type': ct});
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    
    console.log('Step 1: Load app + Create HTML\n');
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    const html = await p.evaluate(({fixture, domainCode}) => {
      const attempt = window.HmvReviewHtml.createPractice(fixture);
      return window.HmvReviewHtml.renderHtml(attempt, domainCode);
    }, {fixture, domainCode: domain_src});
    
    const htmlFile = path.join(output, 'gd1-test.html');
    fs.writeFileSync(htmlFile, html);
    console.log('✓ HTML created:', html.length, 'bytes\n');
    
    console.log('Step 2: Open HTML via HTTP\n');
    const p2 = await c.newPage();
    p2.setDefaultTimeout(15000);
    
    await p2.goto(origin + '/gd1-test.html');
    await p2.waitForLoadState('domcontentloaded');
    
    await p2.screenshot({ path: path.join(output, 'gd1-01-before.png') });
    
    console.log('Step 3: Do quiz + Submit\n');
    const qs = await p2.locator('fieldset[data-question-index]').all();
    for (let i = 0; i < Math.min(2, qs.length); i++) {
      const radio = await qs[i].locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
      }
    }
    
    await p2.locator('button[type="submit"]').click();
    await p2.waitForFunction(() => document.getElementById('result')?.textContent.trim().length > 0, { timeout: 15000 });
    
    console.log('✓ Submit 1 OK\n');
    
    const retry = await p2.evaluate(() => ({
      exists: !!document.getElementById('retry'),
      hidden: document.getElementById('retry')?.hidden
    }));
    
    console.log('Retry button: exists=' + retry.exists + ', hidden=' + retry.hidden);
    
    await p2.screenshot({ path: path.join(output, 'gd1-02-after.png') });
    
    if (retry.exists && !retry.hidden) {
      console.log('\n✅ RETRY BUTTON WORKS!\n');
      
      console.log('Step 4: Click Retry + Submit again\n');
      await p2.locator('#retry').click();
      await p2.waitForFunction(() => !document.getElementById('result')?.textContent, { timeout: 5000 });
      
      const qs2 = await p2.locator('fieldset[data-question-index]').all();
      for (let i = 0; i < Math.min(2, qs2.length); i++) {
        const radio2 = await qs2[i].locator('input[type="radio"]:nth-of-type(2)').first();
        if (await radio2.isVisible().catch(() => false)) await radio2.click();
      }
      
      await p2.locator('button[type="submit"]').click();
      await p2.waitForFunction(() => document.getElementById('result')?.textContent.trim().length > 0, { timeout: 15000 });
      
      console.log('✓ Submit 2 OK\n');
      await p2.screenshot({ path: path.join(output, 'gd1-03-submit2.png') });
      console.log('✅✅ GĐ1 COMPLETE! ✅✅\n');
    } else {
      console.log('\n❌ Retry button failed');
    }
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
