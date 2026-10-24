/**
 * GĐ1 Debug Test: Kiểm tra runtime khởi động và form submit handler
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const http = require('http');
const domain = require('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js');
const HmvReviewHtml = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');

const PORT = 3457;
let server = null;

// Load fixture
const fixture = JSON.parse(fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-multi4.json', 'utf-8'));

// Create practice with attemptLimit:2
let practice = (() => {
  const doc = domain.normalizeDocument(fixture);
  if (!domain.validateDocument(doc).length) {
    return HmvReviewHtml.createPractice({
      ...fixture,
      metadata: { ...fixture.metadata, attemptLimit: 2, purpose: 'Bài tập thường xuyên' }
    });
  }
  throw Error('Fixture không hợp lệ');
})();

console.log('✓ Practice created:', practice.attemptLimit, 'lượt,', practice.questions.length, 'câu');

// Render HTML
let htmlContent = null;
try {
  const domainSource = fs.readFileSync('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js', 'utf-8');
  htmlContent = HmvReviewHtml.renderHtml(practice, domainSource);
  console.log('✓ HTML rendered:', htmlContent.length, 'bytes');
} catch (e) {
  console.error('❌ renderHtml error:', e.message);
  process.exit(1);
}

// Start HTTP server
async function startServer() {
  return new Promise(resolve => {
    server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.url === '/gd1.html') {
        res.writeHead(200, { 
          'Content-Type': 'text/html; charset=utf-8', 
          'Content-Length': htmlContent.length,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        });
        res.end(htmlContent);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => {
      console.log(`✓ Server on http://localhost:${PORT}/gd1.html`);
      resolve();
    });
  });
}

async function runTest() {
  await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n=== GĐ1 Debug: Form Submit & Retry ===\n');
    
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 1024 });
    
    // Clear storage
    await page.evaluate(() => { try { localStorage.clear(); } catch(e) {} });
    
    // Navigate
    await page.goto(`http://localhost:${PORT}/gd1.html`);
    await page.waitForLoadState('networkidle');
    
    // Capture all console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.toString());
    });
    
    // Check initial state
    const initial = await page.evaluate(() => ({
      formExists: !!document.querySelector('form'),
      submitBtn: !!document.getElementById('submit'),
      retryBtn: !!document.getElementById('retry'),
      resultDiv: !!document.getElementById('result')
    }));
    
    console.log('Initial DOM:', initial);
    
    // Answer first question (radio button)
    const firstRadio = await page.$('input[type="radio"]');
    if (firstRadio) {
      await firstRadio.click();
      console.log('✓ Answered first question');
    }
    
    // Setup dialog handler
    let dialogFired = false;
    page.on('dialog', async dialog => {
      dialogFired = true;
      console.log('Dialog:', dialog.message());
      await dialog.accept();
    });
    
    // Monitor form submission
    let formSubmitted = false;
    page.on('response', response => {
      console.log(`Response: ${response.request().method()} ${response.url()} → ${response.status()}`);
    });
    
    // Click submit
    console.log('\n→ Clicking submit button...');
    const submitBtn = await page.$('#submit');
    if (submitBtn) {
      await submitBtn.click({ noWaitAfter: true });
      await page.waitForTimeout(2000); // Wait for form handling + dialog
    }
    
    // Check state after submit
    console.log('\n→ Checking state after submit...');
    const afterSubmit = await page.evaluate(() => ({
      resultText: document.getElementById('result')?.textContent?.slice(0, 80) || '(empty)',
      formHidden: document.querySelector('form')?.hidden,
      resultHidden: document.querySelector('.result-panel')?.hidden,
      retryHidden: document.getElementById('retry')?.hasAttribute('hidden'),
      submitHidden: document.getElementById('submit')?.hidden
    }));
    
    console.log('After submit:', afterSubmit);
    console.log('Dialog fired:', dialogFired);
    console.log('Console logs:', consoleLogs.slice(-5));
    console.log('Page errors:', pageErrors);
    
    // Try to find result text
    const resultElements = await page.$$('*');
    let resultFound = false;
    for (const el of resultElements) {
      const text = await el.textContent();
      if (text && text.includes('Đã nộp') || text.includes('Kết quả') || text.includes('điểm')) {
        console.log('Found result element:', text.slice(0, 100));
        resultFound = true;
        break;
      }
    }
    
    if (!resultFound) {
      console.log('⚠️  No result element found on page');
    }
    
    // Check retry logic
    if (afterSubmit.retryHidden) {
      console.log('⚠️  Retry button is hidden after submit #1');
    } else if (afterSubmit.retryHidden === undefined) {
      console.log('❌ Retry button not found');
    } else {
      console.log('✓ Retry button should be visible');
    }
    
  } catch (e) {
    console.error('❌ Test error:', e.message);
  } finally {
    await browser.close();
    server.close();
  }
}

runTest().catch(e => {
  console.error('Fatal:', e);
  if (server) server.close();
  process.exit(1);
});
