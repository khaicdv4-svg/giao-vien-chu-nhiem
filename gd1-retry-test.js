/**
 * GĐ1 Test: HTML standalone - submit + retry + submit lần 2
 * Yêu cầu: Kiểm thử luồng nộp bài, làm lại, nộp lần 2 với fixture attemptLimit:2
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const http = require('http');
const domain = require('./HOC-MA-VUI-BAN-CHINH/app/review-domain.js');
const HmvReviewHtml = require('./HOC-MA-VUI-BAN-CHINH/app/review-html.js');

const PORT = 3456;
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

console.log('✓ Practice created:');
console.log('  - attemptLimit:', practice.attemptLimit);
console.log('  - questions:', practice.questions.length);

// Render HTML
let htmlContent = null;
try {
  // Get review-domain.js as string for offline scoring
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
      console.log(`✓ Server running at http://localhost:${PORT}/gd1.html`);
      resolve();
    });
  });
}

async function runTest() {
  await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  const page = await context.newPage();
  
  // Set viewport sizes for testing
  const viewports = [
    { name: 'desktop', width: 1280, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ];
  
  const results = [];
  
  try {
    for (const viewport of viewports) {
      console.log(`\n📱 Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewportSize(viewport);
      
      // Clear localStorage
      await page.evaluate(() => { try { localStorage.clear(); } catch(e) {} });
      
      // Navigate
      await page.goto(`http://localhost:${PORT}/gd1.html`);
      await page.waitForLoadState('networkidle');
      
      // Log initial state
      const initialState = await page.evaluate(() => ({
        attemptLimit: window.localStorage.getItem('hmv-practice-v1-test') ? 'stored' : 'not stored',
        formExists: !!document.querySelector('form'),
        submitBtn: !!document.getElementById('submit'),
        retryBtn: !!document.getElementById('retry'),
        resultPanel: !!document.querySelector('.result-panel')
      }));
      
      console.log('  Initial:', initialState);
      
      // Check for errors
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.toString()));
      page.on('console', msg => {
        if (msg.type() === 'error') pageErrors.push(msg.text());
      });
      
      // ===== SUBMIT #1 =====
      console.log('\n  [1/3] Submitting attempt #1...');
      
      // Answer first question
      const firstQuestion = await page.$('[data-question-index="0"]');
      if (!firstQuestion) {
        console.error('  ❌ No questions found');
        break;
      }
      
      // Find first input/radio/option and answer
      const firstInput = await firstQuestion.$('input[type="radio"], input[type="checkbox"], input[type="text"], textarea');
      if (firstInput) {
        const type = await firstInput.getAttribute('type');
        if (type === 'radio' || type === 'checkbox') {
          await firstInput.click();
        } else {
          await firstInput.fill('Test answer');
        }
      }
      
      // Setup dialog handler BEFORE clicking submit
      let dialogHandled = false;
      page.on('dialog', async dialog => {
        if (!dialogHandled) {
          dialogHandled = true;
          console.log('  Dialog:', dialog.message());
          await dialog.accept();
        }
      });
      
      // Click submit without waiting for navigation
      const submitBtn = await page.$('#submit');
      if (submitBtn) {
        await submitBtn.click({ noWaitAfter: true });
        // Give dialog time to appear and be handled
        await page.waitForTimeout(1000);
      }
      
      // Stop listening for dialogs
      page.removeAllListeners('dialog');
      
      // Check result after submit #1
      const afterSubmit1 = await page.evaluate(() => {
        const retryBtn = document.getElementById('retry');
        return {
          resultText: document.getElementById('result')?.textContent || '',
          retryHidden: retryBtn?.hasAttribute('hidden'),
          retryDisplay: retryBtn ? window.getComputedStyle(retryBtn).display : 'unknown',
          formHidden: document.querySelector('form')?.hidden,
          submissionCount: 1
        };
      });
      
      console.log('  After submit #1:', {
        result: afterSubmit1.resultText.slice(0, 50),
        retryHidden: afterSubmit1.retryHidden,
        retryDisplay: afterSubmit1.retryDisplay
      });
      
      results.push({
        viewport: viewport.name,
        step: 'submit1',
        ...afterSubmit1,
        pageErrors: pageErrors.length > 0 ? pageErrors.slice(0, 3) : []
      });
      
      // ===== RETRY =====
      console.log('\n  [2/3] Clicking retry button...');
      
      const retryBtn = await page.$('#retry');
      if (retryBtn) {
        const isHidden = await retryBtn.getAttribute('hidden');
        console.log('  Retry button hidden attr:', isHidden);
        
        try {
          await retryBtn.click();
          await page.waitForTimeout(500);
          
          const afterRetry = await page.evaluate(() => ({
            formReset: document.querySelector('form input[type="text"]')?.value === '',
            resultHidden: document.querySelector('.result-panel')?.hidden,
            submitShown: !document.getElementById('submit')?.hidden,
            retryHidden: document.getElementById('retry')?.hasAttribute('hidden')
          }));
          
          console.log('  After retry:', afterRetry);
          results.push({
            viewport: viewport.name,
            step: 'retry',
            ...afterRetry
          });
        } catch (e) {
          console.error('  ❌ Retry failed:', e.message);
          results.push({
            viewport: viewport.name,
            step: 'retry',
            error: e.message
          });
        }
      } else {
        console.error('  ❌ Retry button not found');
      }
      
      // ===== SUBMIT #2 =====
      console.log('\n  [3/3] Submitting attempt #2...');
      
      // Answer again
      const secondInput = await page.$('input[type="radio"], input[type="checkbox"], input[type="text"], textarea');
      if (secondInput) {
        const type = await secondInput.getAttribute('type');
        if (type === 'radio' || type === 'checkbox') {
          await secondInput.click();
        } else {
          await secondInput.fill('Test answer 2');
        }
      }
      
      // Setup dialog handler BEFORE submit
      let dialogHandled2 = false;
      page.on('dialog', async dialog => {
        if (!dialogHandled2) {
          dialogHandled2 = true;
          console.log('  Dialog:', dialog.message());
          await dialog.accept();
        }
      });
      
      // Submit again without waiting for navigation
      const submitBtn2 = await page.$('#submit');
      if (submitBtn2) {
        await submitBtn2.click({ noWaitAfter: true });
        // Give dialog time to appear and be handled
        await page.waitForTimeout(1000);
      }
      
      // Stop listening
      page.removeAllListeners('dialog');
      
      const afterSubmit2 = await page.evaluate(() => ({
        resultText: document.getElementById('result')?.textContent || '',
        retryHidden: document.getElementById('retry')?.hasAttribute('hidden'),
        exhausted: document.getElementById('attempt-limit-status')?.textContent?.includes('hết lượt') || false
      }));
      
      console.log('  After submit #2:', {
        result: afterSubmit2.resultText.slice(0, 50),
        retryHidden: afterSubmit2.retryHidden,
        exhausted: afterSubmit2.exhausted
      });
      
      results.push({
        viewport: viewport.name,
        step: 'submit2',
        ...afterSubmit2
      });
      
      console.log('  Page errors during test:', pageErrors);
    }
  } catch (e) {
    console.error('❌ Test error:', e.message);
    results.push({ error: e.message });
  } finally {
    await browser.close();
    server.close();
  }
  
  // Report
  console.log('\n' + '='.repeat(60));
  console.log('TEST REPORT — GĐ1 Retry Button & Submit Flow');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    console.log(`\n[${r.viewport}/${r.step}]`, JSON.stringify(r, null, 2));
  });
  
  // Save report
  fs.writeFileSync('./gd1-test-report.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Report saved to gd1-test-report.json');
  
  // Check for failures
  const failures = results.filter(r => r.error || r.pageErrors?.length || r.retryHidden === true || r.exhausted === false);
  if (failures.length > 0) {
    console.log('\n⚠️  Potential issues found:');
    failures.forEach(f => console.log(`  - [${f.viewport}/${f.step}]`, f.error || f.pageErrors?.[0] || 'Retry/exhausted logic issue'));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

runTest().catch(e => {
  console.error('Fatal:', e);
  if (server) server.close();
  process.exit(1);
});
