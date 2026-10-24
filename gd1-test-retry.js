const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

const PORT = 3461;
const server = http.createServer((req, res) => {
  if (req.url === '/gd1.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(`http://localhost:${PORT}/gd1.html`);
  await page.waitForLoadState('networkidle');
  
  console.log('=== GĐ1 Test: Submit #1 → Retry → Submit #2 ===\n');
  
  // [1] SUBMIT #1
  console.log('[1/3] Submit attempt #1...');
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1500);
  
  let state1 = await page.evaluate(() => ({
    resultText: document.getElementById('result')?.textContent?.slice(0, 50),
    retryHidden: document.getElementById('retry')?.hasAttribute('hidden'),
    formDisabled: document.querySelector('form input')?.disabled
  }));
  console.log('  After submit #1:', state1);
  
  // [2] RETRY
  console.log('\n[2/3] Clicking retry button...');
  const retryBtn = await page.$('#retry');
  if (retryBtn) {
    const isHidden = await retryBtn.getAttribute('hidden');
    console.log('  Retry button hidden attr:', isHidden);
    
    try {
      await retryBtn.click();
      await page.waitForTimeout(800);
      
      let afterRetry = await page.evaluate(() => ({
        formReset: document.querySelector('form input[type="radio"]')?.checked,
        resultHidden: document.querySelector('.result-panel')?.hidden,
        formHidden: document.querySelector('form')?.hidden,
        inputEnabled: !document.querySelector('form input')?.disabled
      }));
      console.log('  After retry:', afterRetry);
    } catch (e) {
      console.log('  ❌ Retry error:', e.message.slice(0, 80));
    }
  } else {
    console.log('  ❌ Retry button not found');
  }
  
  // [3] SUBMIT #2
  console.log('\n[3/3] Submit attempt #2...');
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1500);
  
  let state2 = await page.evaluate(() => ({
    resultText: document.getElementById('result')?.textContent?.slice(0, 50),
    retryHidden: document.getElementById('retry')?.hasAttribute('hidden'),
    exhausted: document.getElementById('attempt-limit-status')?.textContent?.includes('hết lượt')
  }));
  console.log('  After submit #2:', state2);
  
  console.log('\n=== ✅ GĐ1 Test Complete ===');
  
  await browser.close();
  server.close();
})();
