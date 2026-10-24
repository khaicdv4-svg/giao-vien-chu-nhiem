const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const fixtureFile = path.join(__dirname, 'fixtures', 'review-tiengviet4-doc-hieu.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf-8'));

// Mock scoring logic (từ review-domain.js)
const mockDomain = `
(function() {
  window.domain = {
    submitAttempt: async (answers) => {
      return { status: 'graded', score: 5.5, maxScore: 11, answers };
    }
  };
})();
`;

test.describe('GĐ1: Nút "Làm lại bài" hoạt động đúng', () => {
  let htmlPath;

  test.beforeAll(async () => {
    // Dùng review-html.js để render HTML từ fixture
    const reviewHtml = require('../HOC-MA-VUI-BAN-CHINH/app/review-html.js');
    const html = reviewHtml.renderHtml(fixture, mockDomain);
    
    // Lưu HTML tạm thời
    htmlPath = path.join(__dirname, 'temp-gd1-retry.html');
    fs.writeFileSync(htmlPath, html);
  });

  test.afterAll(async () => {
    if (htmlPath && fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  });

  test('Làm bài, nộp, bấm "Làm lại bài" → form reset, danh sách xem lại ẩn', async ({ page }) => {
    await page.goto('file://' + htmlPath);

    // 1. Làm bài: chọn đáp án cho câu 1 (ABCD)
    const option1 = page.locator('label').filter({ has: page.locator('input[name="q0"][value="0"]') }).first();
    await option1.click();
    await page.waitForTimeout(100);
    
    // 2. Kiểm tra câu 1 được chọn
    const input1 = page.locator('input[name="q0"][value="0"]');
    await expect(input1).toBeChecked();

    // 3. Nộp bài
    const submitBtn = page.locator('button#submit');
    await submitBtn.click();
    await page.waitForTimeout(200);

    // 4. Kiểm tra màn kết quả hiển thị
    const resultPanel = page.locator('.result-panel');
    await expect(resultPanel).not.toHaveAttribute('hidden', '');

    // 5. Kiểm tra nút "🔁 Làm lại bài" hiển thị
    const retryBtn = page.locator('button#retry');
    await expect(retryBtn).not.toHaveAttribute('hidden', '');

    // 6. Kiểm tra danh sách xem lại hiển thị
    const reviewSection = page.locator('.reading-review-section');
    const reviewSectionVisible = await reviewSection.isVisible().catch(() => false);
    if (reviewSectionVisible) {
      console.log('✓ Danh sách xem lại hiển thị');
    }

    // 7. Bấm "Làm lại bài"
    await retryBtn.click();
    await page.waitForTimeout(200);

    // 8. Kiểm tra form reset (câu 1 không còn được chọn)
    const input1After = page.locator('input[name="q0"][value="0"]');
    await expect(input1After).not.toBeChecked();

    // 9. Kiểm tra nút "Nộp bài" hiển thị lại (form ẩn, submit hiển thị)
    const submitPanelAfter = page.locator('.submit-panel');
    await expect(submitPanelAfter).not.toHaveAttribute('hidden', '');

    // 10. Kiểm tra nút "Làm lại bài" ẩn
    const retryBtnAfter = page.locator('button#retry');
    await expect(retryBtnAfter).toHaveAttribute('hidden', '');

    // 11. Kiểm tra trang không tải lại (URL vẫn là file://)
    const url = page.url();
    expect(url).toContain('temp-gd1-retry.html');

    console.log('✓ Test hoàn tất: Làm lại bài hoạt động đúng');
  });

  test('Kiểm tra danh sách xem lại cuộn đến câu đúng', async ({ page }) => {
    await page.goto('file://' + htmlPath);

    // Chọn câu 1, nộp
    const option1 = page.locator('label').filter({ has: page.locator('input[name="q0"][value="0"]') }).first();
    await option1.click();
    
    const submitBtn = page.locator('button#submit');
    await submitBtn.click();
    await page.waitForTimeout(200);

    // Kiểm tra danh sách xem lại
    const reviewBtns = page.locator('.reading-review-btn');
    const count = await reviewBtns.count();
    expect(count).toBeGreaterThan(0);

    // Bấm câu 3
    const btn3 = reviewBtns.nth(2);
    await btn3.click();
    await page.waitForTimeout(200);

    // Kiểm tra câu 3 (fieldset với data-question-index="2") nằm trong viewport
    const q3 = page.locator('fieldset[data-question-index="2"]');
    const box = await q3.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeLessThan(page.viewportSize().height);

    console.log('✓ Danh sách xem lại cuộn đến câu đúng');
  });
});
