'use strict';
// Debug: xem renderHtml làm gì
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');

(async () => {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const t = path.resolve(app, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
    if (!t.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(t, (e, d) => {
      const ct = {'.html': 'text/html; charset=utf-8','.js': 'text/javascript','.css': 'text/css','.json': 'application/json'}[path.extname(t)] || 'application/octet-stream';
      res.writeHead(e ? 404 : 200, {'Content-Type': ct});
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
    p.setDefaultTimeout(5000);
    p.on('console', msg => {
      if (msg.type() !== 'log') return;
      console.log('LOG:', msg.text().substring(0, 80));
    });
    p.on('pageerror', e => console.error('PAGE ERR:', e.message));
    
    await p.goto(origin + '/');
    await p.waitForLoadState('domcontentloaded');
    
    const result = await p.evaluate(({raw, dom}) => {
      const debug = {};
      
      try {
        // Check thư viện
        debug.hasHmvReviewHtml = !!window.HmvReviewHtml;
        debug.hasRenderHtml = window.HmvReviewHtml?.renderHtml ? 'yes' : 'no';
        debug.hasDomain = !!window.HmvReviewDomain;
        
        // Gọi renderHtml
        window.HmvReviewHtml.renderHtml(raw, dom);
        
        // Check sau render
        debug.htmlContainer = document.querySelector('form') ? 'yes' : 'no';
        debug.fieldsets = document.querySelectorAll('fieldset').length;
        debug.fieldsetQs = document.querySelectorAll('fieldset[data-question-index]').length;
        debug.bodyHTML = document.body.innerHTML.substring(0, 200);
        
        return {ok: true, debug};
      } catch (e) {
        debug.error = e.message;
        return {ok: false, debug};
      }
    }, {raw: fixture_data, dom: domain_source});
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => console.error('Error:', err.message));
