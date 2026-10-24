delete require.cache[Object.keys(require.cache).find(k => k.includes('review-html'))];
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const fWithLimit = {...f, metadata: {...f.metadata, attemptLimit: 2}};
const p = h.createPractice(fWithLimit);
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

const PORT = 3465;
const server = http.createServer((req, res) => {
  if (req.url === '/gd1.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  
  // Context 1: Check initial state
  const ctx1 = await browser.newContext();
  const pg1 = await ctx1.newPage();
  await pg1.goto(`http://localhost:${PORT}/gd1.html`);
  
  const storage1 = await pg1.evaluate(() => ({ localStorage: localStorage.length, keys: Object.keys(localStorage) }));
  console.log('Initial localStorage:', storage1);
  
  // Answer + submit
  await pg1.$('input[type="radio"]').then(el => el?.click());
  pg1.once('dialog', async d => { await d.accept(); });
  await pg1.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await pg1.waitForTimeout(1500);
  
  const storage2 = await pg1.evaluate(() => {
    const keys = Object.keys(localStorage);
    const vals = keys.map(k => [k, localStorage.getItem(k)?.slice(0, 50)]);
    return { count: keys.length, items: vals };
  });
  console.log('After submit #1:', storage2);
  
  const retry = await pg1.$('#retry');
  const retryHidden = await retry?.evaluate(el => el.hidden);
  console.log('Retry hidden:', retryHidden);
  
  await pg1.close();
  await ctx1.close();
  
  // Context 2: Fresh load (should have no old storage)
  console.log('\n--- Fresh context ---');
  const ctx2 = await browser.newContext();
  const pg2 = await ctx2.newPage();
  await pg2.goto(`http://localhost:${PORT}/gd1.html`);
  
  const storage3 = await pg2.evaluate(() => localStorage.length);
  console.log('Fresh page localStorage length:', storage3);
  
  await pg2.close();
  await ctx2.close();
  
  await browser.close();
  server.close();
})();
