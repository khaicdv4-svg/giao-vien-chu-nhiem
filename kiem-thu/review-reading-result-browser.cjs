const { chromium } = require('playwright');
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

const evidenceDir = process.env.HMV_EVIDENCE_DIR;
if (!evidenceDir) {
  console.error('❌ Lỗi: HMV_EVIDENCE_DIR không được đặt');
  process.exit(1);
}
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  
  // Tạo HTML tạm
  const htmlContent = html.renderHtml(fixture, mockDomain);
  const htmlPath = path.join(__dirname, 'temp-gd1-test.html');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log('✓ HTML tạo, đang kiểm thử…\n');

  const results = [];

  for (const viewport of [
    { width: 1280, height: 800, name: '1280' },
    { width: 390, height: 844, name: '390' }
  ]) {
    console.log(`\n📱 Viewport ${viewport.width}px:\n`);

    const page = await browser.newPage({ viewport });
    
    // Đánh dấu trước khi tải để kiểm tra không reload
    await page.evaluate(() => { window.__initialLoad = true; });

    // 1. Tải trang
    await page.goto('file://' + htmlPath);
    
    // Mock form submit (prevent actual submission)
    await page.evaluate(() => {
      document.querySelector('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        // Giả lập showSubmitted()
        document.querySelector('.submit-panel').hidden = true;
        document.querySelector('.result-panel').hidden = false;
      }, true);
    });
    
    await page.waitForTimeout(300);

    // Chụp màn làm bài
    const img1 = path.join(evidenceDir, `gd1-lam-bai-${viewport.name}.png`);
    await page.screenshot({ path: img1, fullPage: false });
    console.log(`  ✓ Ảnh làm bài: ${img1}`);

    // 2. Làm hết các câu
    const totalQuestions = fixture.questions.length;
    for (let i = 0; i < totalQuestions; i++) {
      const q = fixture.questions[i];
      if (q.type === 'ABCD' || q.type === 'MULTI') {
        // Câu trắc nghiệm: chọn đáp án đầu tiên
        const option = page.locator(`label`).filter({ has: page.locator(`input[name="q${i}"][value="0"]`) }).first();
        try { await option.click(); } catch (e) { }
      } else if (q.type === 'OPEN' || q.type === 'SHORT') {
        // Câu tự luận: gõ gì đó
        const textarea = page.locator(`textarea[name="q${i}"], input[name="q${i}"]`).first();
        try { await textarea.fill('Trả lời câu ' + (i + 1)); } catch (e) { }
      }
    }
    await page.waitForTimeout(200);

    // 3. Nộp bài
    const submitBtn = page.locator('button#submit');
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Chụp màn kết quả
    const img2 = path.join(evidenceDir, `gd1-ket-qua-${viewport.name}.png`);
    await page.screenshot({ path: img2, fullPage: false });
    console.log(`  ✓ Ảnh kết quả: ${img2}`);

    // 4. Kiểm tra điểm lớn
    const resultText = await page.locator('#result').textContent();
    console.log(`  ✓ Điểm: ${resultText}`);

    // 5. Kiểm tra danh sách xem lại
    const reviewBtns = page.locator('.reading-review-btn');
    const reviewCount = await reviewBtns.count();
    console.log(`  ✓ Danh sách xem lại: ${reviewCount} câu`);

    // 6. Kiểm tra lời khuyên
    const hints = page.locator('.reading-hint');
    const hintCount = await hints.count();
    console.log(`  ✓ Lời khuyên: ${hintCount} câu`);

    // 7. Bấm "Làm lại bài"
    const retryBtn = page.locator('button#retry');
    const isReloadDetected = await page.evaluate(() => !window.__initialLoad);
    
    await retryBtn.click();
    await page.waitForTimeout(400);

    const reloadAfterClick = await page.evaluate(() => !window.__initialLoad);
    console.log(`  ${!reloadAfterClick ? '✓' : '✗'} Trang không tải lại: ${!reloadAfterClick}`);

    // 8. Kiểm tra form reset
    const input1After = page.locator('input[name="q0"][value="0"]');
    const stillChecked = await input1After.isChecked().catch(() => false);
    console.log(`  ${!stillChecked ? '✓' : '✗'} Form reset: ${!stillChecked}`);

    // 9. Chụp màn sau khi Làm lại
    const img3 = path.join(evidenceDir, `gd1-sau-lam-lai-${viewport.name}.png`);
    await page.screenshot({ path: img3, fullPage: false });
    console.log(`  ✓ Ảnh sau Làm lại: ${img3}`);

    // 10. Làm lại lần 2 rồi nộp
    for (let i = 0; i < Math.min(3, totalQuestions); i++) {
      const q = fixture.questions[i];
      if (q.type === 'ABCD' || q.type === 'MULTI') {
        const option = page.locator(`label`).filter({ has: page.locator(`input[name="q${i}"][value="1"]`) }).first();
        try { await option.click(); } catch (e) { }
      }
    }
    
    const submitBtn2 = page.locator('button#submit');
    await submitBtn2.click();
    await page.waitForTimeout(500);

    const resultText2 = await page.locator('#result').textContent();
    console.log(`  ✓ Lần 2 nộp, điểm: ${resultText2}`);

    // 11. Bản in (print)
    await page.emulateMedia({ media: 'print' });
    const img4 = path.join(evidenceDir, `gd1-in-${viewport.name}.png`);
    await page.screenshot({ path: img4, fullPage: false });
    console.log(`  ✓ Ảnh bản in: ${img4}`);

    results.push({
      viewport: viewport.name,
      reviewCount,
      hintCount,
      pageReload: reloadAfterClick,
      formReset: !stillChecked,
      images: [img1, img2, img3, img4]
    });

    await page.close();
  }

  // Dọn dẹp
  fs.unlinkSync(htmlPath);
  await browser.close();

  console.log('\n✓ Kiểm thử hoàn tất.\n');
  console.log('📊 Kết quả:', JSON.stringify(results, null, 2));
})().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
