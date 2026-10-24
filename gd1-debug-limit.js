delete require.cache[Object.keys(require.cache).find(k => k.includes('review-html'))];
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');

// Inject debug code into HTML
const htmlBase = h.renderHtml(p, ds);
const htmlDebug = htmlBase.replace(
  "function updateLimit(){if(!configured)return;",
  "function updateLimit(){console.log('[updateLimit] configured='+configured+' status='+attempt.status+' attempts.length='+(submissions?.length||0)+' attemptLimit='+initial.attemptLimit); if(!configured)return;"
);

const PORT = 3463;
const server = http.createServer((req, res) => {
  if (req.url === '/gd1.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlDebug);
  }
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  
  await page.goto(`http://localhost:${PORT}/gd1.html`, { waitUntil: 'networkidle' });
  
  console.log('Initial logs:', consoleLogs.slice(0, 3));
  
  // Submit #1
  await page.$('input[type="radio"]').then(el => el?.click());
  page.once('dialog', async d => { await d.accept(); });
  await page.$('#submit').then(el => el?.click({ noWaitAfter: true }));
  await page.waitForTimeout(1500);
  
  console.log('\nAfter submit #1:');
  consoleLogs.filter(l => l.includes('updateLimit') || l.includes('Kết quả')).forEach(l => console.log('  ', l));
  
  const state = await page.evaluate(() => ({
    status: window.lastAttemptStatus,
    retryHidden: document.getElementById('retry')?.hidden,
    submissions: typeof submissions
  }));
  console.log('State:', state);
  
  await browser.close();
  server.close();
})();
