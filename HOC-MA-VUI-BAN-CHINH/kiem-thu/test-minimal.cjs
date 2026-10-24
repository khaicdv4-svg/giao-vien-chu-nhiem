const { chromium } = require('playwright');

(async () => {
  console.log('Bắt đầu test tối thiểu Chromium...');
  try {
    const browser = await chromium.launch({ 
      args: ['--no-sandbox', '--disable-gpu'],
      headless: true 
    });
    console.log('✓ Chromium khởi động');
    
    const page = await browser.newPage();
    console.log('✓ Trang mới');
    
    await page.goto('about:blank');
    console.log('✓ Vào about:blank');
    
    await page.screenshot({ path: 'test-minimal.png' });
    console.log('✓ Screenshot: test-minimal.png');
    
    await browser.close();
    console.log('✓ Chromium đóng, xong!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
})();
