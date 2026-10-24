// Fresh load of module to pick up changes
delete require.cache[Object.keys(require.cache).find(k => k.includes('review-html'))];
delete require.cache[Object.keys(require.cache).find(k => k.includes('review-domain'))];

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

console.log('HTML check:');
console.log('  - Has "Initialize after":', html.includes('Initialize after') ? '✓' : '❌');
console.log('  - retryButton.hidden=true:', html.includes('retryButton.hidden=true') ? '✓' : '❌');
console.log('  - retryButton.hidden=false:', html.includes('retryButton.hidden=false') ? '✓' : '❌');

const PORT = 3462;
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
  
  console.log('\n=== Full GĐ1 Test ===\n');
  
  await page.goto(`http://localhost:${PORT}/gd1.html`, { waitUntil: 'networkidle' });
  
  // [1] SUBMIT #1
  console.log('[1] Submit #1...');
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1200);
  
  let s1 = await page.evaluate(() => ({
    result: document.getElementById('result')?.textContent?.slice(0, 40),
    retryVisible: !document.getElementById('retry')?.hidden,
    formEnabled: !document.querySelector('form input')?.disabled
  }));
  console.log('   Status:', s1);
  
  // [2] RETRY  
  if (s1.retryVisible) {
    console.log('\n[2] Retry...');
    await page.$('#retry').then(el => el?.click());
    await page.waitForTimeout(800);
    
    let s2 = await page.evaluate(() => ({
      resultHidden: document.querySelector('.result-panel')?.hidden,
      formClear: !document.querySelector('input[type="radio"]')?.checked,
      formEnabled: !document.querySelector('form input')?.disabled
    }));
    console.log('   Status:', s2);
  } else {
    console.log('\n[2] ❌ Retry button not visible (retryButton.hidden =', await page.$('#retry').then(el => el?.getAttribute('hidden')), ')');
  }
  
  // [3] SUBMIT #2
  console.log('\n[3] Submit #2...');
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1200);
  
  let s3 = await page.evaluate(() => ({
    result: document.getElementById('result')?.textContent?.slice(0, 40),
    retryHidden: document.getElementById('retry')?.hidden,
    exhausted: document.getElementById('attempt-limit-status')?.textContent?.includes('hết lượt')
  }));
  console.log('   Status:', s3);
  
  console.log('\n=== Summary ===');
  console.log('Submit #1: ✓');
  console.log('Retry button visible:', s1.retryVisible ? '✓' : '❌');
  console.log('Submit #2: ✓');
  console.log('Exhausted:', s3.exhausted ? '✓ (correct)' : '❌');
  
  await browser.close();
  server.close();
})();
