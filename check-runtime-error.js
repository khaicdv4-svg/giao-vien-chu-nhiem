const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

const PORT = 3458;
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
  console.log('Server on port', PORT);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[error] ${err.toString()}`));
  
  await page.goto(`http://localhost:${PORT}/gd1.html`);
  await page.waitForLoadState('networkidle');
  
  console.log('\n=== Console output ===');
  logs.forEach(l => console.log(l));
  
  console.log('\n=== Checking runtime attachment ===');
  const hasSubmitListener = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? (form.onsubmit ? 'has onsubmit property' : 'no onsubmit property') : 'no form';
  });
  console.log('Form submit handler:', hasSubmitListener);
  
  await browser.close();
  server.close();
})();
