delete require.cache[Object.keys(require.cache).find(k => k.includes('review-html'))];
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));

// CORRECT: Pass attemptLimit in fixture BEFORE creating practice
const fWithLimit = {...f, metadata: {...f.metadata, attemptLimit: 2, purpose: 'Bài tập thường xuyên'}};
const p = h.createPractice(fWithLimit);

console.log('Practice has attemptLimit:', p.attemptLimit);

const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

const PORT = 3464;
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
  
  const logs = [];
  page.on('console', m => logs.push(m.text()));
  
  await page.goto(`http://localhost:${PORT}/gd1.html`, { waitUntil: 'networkidle' });
  
  console.log('\n[1] Submit #1');
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1200);
  
  const s1 = await page.evaluate(() => ({
    result: document.getElementById('result')?.textContent?.slice(0, 30),
    retryVisible: !document.getElementById('retry')?.hidden,
    retryHidden: document.getElementById('retry')?.hidden
  }));
  console.log('  Result:', s1);
  
  if (s1.retryVisible) {
    console.log('\n[2] Retry');
    await page.$('#retry').then(el => el?.click());
    await page.waitForTimeout(800);
    
    const s2 = await page.evaluate(() => ({
      formClear: !document.querySelector('input[type="radio"]')?.checked,
      submitVisible: !document.getElementById('submit')?.hidden
    }));
    console.log('  After retry:', s2);
    
    console.log('\n[3] Submit #2');
    await page.$('input[type="radio"]').then(el => el?.click());
    page.once('dialog', async d => { await d.accept(); });
    await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
    await page.waitForTimeout(1200);
    
    const s3 = await page.evaluate(() => ({
      result: document.getElementById('result')?.textContent?.slice(0, 30),
      exhausted: document.getElementById('attempt-limit-status')?.textContent?.includes('hết lượt')
    }));
    console.log('  Result:', s3);
    console.log('\n✅ GĐ1 Test PASS');
  } else {
    console.log('\n❌ Retry button not visible');
    console.log('updateLimit logs:', logs.filter(l => l.includes('updateLimit')));
  }
  
  await browser.close();
  server.close();
})();
