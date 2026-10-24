const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const h = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');
const f = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json'));
const p = h.createPractice({...f, metadata:{...f.metadata,attemptLimit:2,purpose:'Bài tập thường xuyên'}});
const ds = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js','utf-8');
const html = h.renderHtml(p, ds);

// Extract the actual initialization script
const scriptMatch = html.match(/<script>(.*?)<\/script>$/s);
if (scriptMatch) {
  const scriptCode = scriptMatch[1];
  // Check for try-catch
  const hasTry = scriptCode.includes('try{(');
  console.log('Has try-catch wrapping runtime:', hasTry);
  
  // Check what errors might occur
  console.log('\n--- Script structure ---');
  const lines = scriptCode.split('\n');
  lines.slice(-5).forEach((l, i) => {
    console.log(`${lines.length - 5 + i}: ${l.substring(0, 100)}`);
  });
}

const PORT = 3459;
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
  
  let allErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('runtime error') || text.includes('Cannot read')) {
      allErrors.push(text);
    }
  });
  page.on('pageerror', err => allErrors.push(err.toString()));
  
  await page.goto(`http://localhost:${PORT}/gd1.html`, { waitUntil: 'networkidle' });
  
  console.log('\n--- Console errors ---');
  if (allErrors.length) {
    allErrors.forEach(e => console.log('ERROR:', e.substring(0, 150)));
  } else {
    console.log('(no errors logged)');
  }
  
  console.log('\n--- Checking DOM ---');
  const dom = await page.evaluate(() => ({
    formExists: !!document.querySelector('form'),
    formChildren: document.querySelector('form')?.children?.length || 0
  }));
  console.log('DOM state:', dom);
  
  await browser.close();
  server.close();
})();
