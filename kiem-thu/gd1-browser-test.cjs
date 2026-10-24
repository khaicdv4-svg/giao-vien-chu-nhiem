const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const fixtureFile = path.join(__dirname, '..', 'HOC-MA-VUI-BAN-CHINH', 'kiem-thu', 'fixtures', 'review-tiengviet4-doc-hieu.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf-8'));

// Load review-html.js
const html = require('../HOC-MA-VUI-BAN-CHINH/app/review-html.js');

// Mock domain
const mockDomain = `
(function() {
  window.domain = {
    submitAttempt: async (answers) => {
      return { status: 'graded', score: 5.5, maxScore: 11, answers };
    }
  };
})();
`;

const evidenceDir = process.env.HMV_EVIDENCE_DIR || path.join(__dirname, 'screenshots');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  
  // Tạo HTML tạm
  const htmlContent = html.renderHtml(fixture, mockDomain);
  const htmlPath = path.join(__dirname, 'temp-gd1-browser-test.html');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log('✓ HTML tạo thành công, đang kiểm thử trình duyệt…\n');

  for (const viewport of [{ width: 1280, height: 800, name: '1280' }, { width: 390, height: 844, name: '390' }]) {
    const context = await browser.createContext({ viewport });
    const page = await context.newPage();

    console.log(`📱 Kiểm thử ở ${viewport.width}px:`);

    // 1. Tải trang
    await page.goto('file://' + htmlPath);
    await page.waitForTimeout(200);

    // Chụp màn làm bài
    const screenshotMaking = path.join(evidenceDir, `gd1-lam-bai-${viewport.name}.png`);
    await page.screenshot({ path: screenshotMaking, fullPage: false });
    console.log(`  ✓ Lưu: ${screenshotMaking}`);

    // 2. Làm bài: chọn câu 1
    const option1 = page.locator('label').filter({ has: page.locator('input[name="q0"][value="0"]') }).first();
    await option1.click();
    await page.waitForTimeout(100);

    // 3. Nộp bài
    const submitBtn = page.locator('button#submit');
    await submitBtn.click();
    await page.waitForTimeout(300);

    // Chụp màn kết quả
    const screenshotResult = path.join(evidenceDir, `gd1-ket-qua-${viewport.name}.png`);
    await page.screenshot({ path: screenshotResult, fullPage: false });
    console.log(`  ✓ Lưu: ${screenshotResult}`);

    // 4. Kiểm tra nút "Làm lại bài" hiển thị
    const retryBtn = page.locator('button#retry');
    const retryVisible = await retryBtn.isVisible();
    console.log(`  ${retryVisible ? '✓' : '✗'} Nút "🔁 Làm lại bài" ${retryVisible ? 'hiển thị' : 'ẩn'}`);

    // 5. Kiểm tra danh sách xem lại
    const reviewSection = page.locator('.reading-review-section');
    const reviewVisible = await reviewSection.isVisible().catch(() => false);
    console.log(`  ${reviewVisible ? '✓' : '✗'} Danh sách xem lại ${reviewVisible ? 'hiển thị' : 'ẩn'}`);

    // 6. Kiểm tra lời khuyên (hint)
    const hints = page.locator('.reading-hint');
    const hintCount = await hints.count();
    console.log(`  ✓ Lời khuyên: ${hintCount} câu có`);

    // 7. Bấm "Làm lại bài"
    await retryBtn.click();
    await page.waitForTimeout(300);

    // 8. Kiểm tra form reset: câu 1 không còn được chọn
    const input1After = page.locator('input[name="q0"][value="0"]');
    const isChecked = await input1After.isChecked().catch(() => false);
    console.log(`  ${!isChecked ? '✓' : '✗'} Sau bấm "Làm lại": câu 1 ${!isChecked ? 'được reset' : 'vẫn chọn'}`);

    // 9. Kiểm tra nút submit hiển thị lại
    const submitPanelAfter = page.locator('.submit-panel');
    const submitPanelVisible = await submitPanelAfter.isVisible().catch(() => false);
    console.log(`  ${submitPanelVisible ? '✓' : '✗'} Nút "Nộp bài" ${submitPanelVisible ? 'hiển thị' : 'ẩn'}`);

    // 10. Kiểm tra CSS in (print)
    const printScreenshot = path.join(evidenceDir, `gd1-in-${viewport.name}.png`);
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: printScreenshot, fullPage: false });
    console.log(`  ✓ Lưu bản in: ${printScreenshot}`);

    await context.close();
    console.log();
  }

  // Dọn dẹp
  fs.unlinkSync(htmlPath);
  await browser.close();

  console.log('✓ Kiểm thử hoàn tất. Ảnh chụp lưu ở:', evidenceDir);
})().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
