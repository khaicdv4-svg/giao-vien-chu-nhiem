const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

console.log('HTML includes fix:', html.includes('Initialize after all listeners') ? '✓' : '❌');

const PORT = 3460;
const server = http.createServer((req, res) => {
  if (req.url === '/gd1.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end();
  }
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(`http://localhost:${PORT}/gd1.html`);
  await page.waitForLoadState('networkidle');
  
  console.log('\n=== Test: Form Submit #1 ===');
  
  // Answer first radio
  await page.$('input[type="radio"]').then(el => el?.click());
  
  // Setup dialog handler
  let dialogFired = false;
  page.once('dialog', async d => { dialogFired = true; await d.accept(); });
  
  // Track responses
  let responses = [];
  page.on('response', r => responses.push({ method: r.request().method(), url: r.url(), status: r.status() }));
  
  // Click submit
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1500);
  
  // Check result
  const result = await page.evaluate(() => ({
    resultText: document.getElementById('result')?.textContent?.slice(0, 80) || '(empty)',
    formHidden: document.querySelector('form')?.hidden,
    resultHidden: document.querySelector('.result-panel')?.hidden,
    dialog: typeof window.confirm
  }));
  
  console.log('Result:', result);
  console.log('Dialog fired:', dialogFired);
  console.log('Responses:', responses.filter(r => r.url.includes('gd1')));
  
  await browser.close();
  server.close();
})();
