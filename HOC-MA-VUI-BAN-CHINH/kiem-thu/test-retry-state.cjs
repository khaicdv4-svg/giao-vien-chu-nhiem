const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, { 'Content-Type': ct });
      res.end(e ? '' : d);
    });
  });
  
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  const domain_source = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  
  try {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage();
    p.setDefaultTimeout(10000);
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    const html = await p.evaluate(({raw, dom}) => window.HmvReviewHtml.renderHtml(raw, dom), {raw: fixture_data, dom: domain_source});
    await p.evaluate((h) => { document.body.innerHTML = h; }, html);
    await p.waitForFunction(() => document.querySelectorAll('fieldset[data-question-index]').length > 0, { timeout: 5000 });
    
    // Nộp
    const qs = await p.locator('fieldset[data-question-index]').all();
    const inp = await qs[0].locator('input[type="radio"]').first();
    await inp.click();
    await p.locator('button:has-text("Nộp")').click();
    await p.waitForFunction(() => document.querySelector('[class*="result"]'), { timeout: 5000 });
    
    // Debug trạng thái
    const state = await p.evaluate(() => {
      return {
        retryExists: !!document.getElementById('retry'),
        retryHidden: document.getElementById('retry')?.hidden,
        retryStyle: document.getElementById('retry')?.style.display,
        hasResult: !!document.querySelector('[class*="result"]'),
        submitPanel: document.querySelector('.submit-panel')?.innerHTML?.substring(0, 200)
      };
    });
    
    console.log('State after submit:', JSON.stringify(state, null, 2));
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => console.error('❌', err.message));
