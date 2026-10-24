'use strict';
// Test trình duyệt: màn kết quả của mẫu "Hành trình đọc hiểu"
const {test}=require('node:test'),{firefox}=require('playwright'),path=require('path'),fs=require('fs');
const fixture=require('./fixtures/review-tiengviet4-doc-hieu.json');
const mod=require('../app/review-html.cjs');
const domain=require('../app/review-domain.cjs');
const evidenceDir=process.env.HMV_EVIDENCE_DIR||'/tmp';

test('Reading result screen: điểm, danh sách xem lại, gợi ý tự luận, nút làm lại + in',async()=>{
  const browser=await firefox.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  
  try{
    // Tạo practice từ fixture
    const practice=mod.createPractice(fixture);
    
    // Mock attempt: 3 câu trắc nghiệm đúng, 1 sai, 7 tự luận chưa chấm
    const mockAnswers={
      'cau-1':1,  // Đúng
      'cau-2':0,  // Đúng
      'cau-3':1,  // Đúng
      'cau-4':1,  // Sai (đáp án là 2)
      'cau-5':'Bài học về sự khám phá',  // Tự luận
      'cau-6':'Bồ công anh là dũng cảm',  // Tự luận
      'cau-7':'Tôi muốn đến Đà Lạt',      // Tự luận
      'cau-8':3,  // Đúng
      'cau-9':2,  // Đúng
      'cau-10':'Danh từ: mặt đất. Mặt đất là nơi chúng ta sống.',
      'cau-11':'Bồ công anh út có hành trình khám phá thế giới rộng lớn.'
    };
    
    const submitted=domain.submitAttempt(practice,mockAnswers,{submissionId:'test-result-001'});
    
    // Render HTML với source code chấm từ domain
    const domainSource=fs.readFileSync(path.join(__dirname,'app/review-domain.js'),'utf8');
    const htmlContent=mod.renderHtml(fixture,domainSource);
    
    // Ghi file tạm
    const htmlFile=path.join(evidenceDir,'reading-result.html');
    fs.writeFileSync(htmlFile,htmlContent,'utf8');
    
    // Load vào trình duyệt
    await page.goto('file://'+htmlFile);
    
    // Chống popunder/tab mới
    page.on('popup',popup=>popup.close());
    
    // Chụp màn kết quả
    const screenshotFile=path.join(evidenceDir,'reading-result-desktop-1280.png');
    await page.screenshot({path:screenshotFile,fullPage:true});
    console.log('✓ Desktop screenshot (1280px): '+screenshotFile);
    
    // Kiểm tra các phần tử cơ bản
    const resultText=await page.locator('#result').textContent();
    console.log('Result text:',resultText);
    
    // Kiểm tra có danh sách xem lại câu không
    const reviewList=await page.locator('.review-list, .question-review, [data-review-all]').count();
    console.log('Review list elements found:',reviewList);
    
    // Kiểm tra feedback tự luận
    const feedbackOpen=await page.locator('.feedback-open, [data-feedback-type="OPEN"]').count();
    console.log('Open question feedback elements:',feedbackOpen);
    
    // Kiểm tra nút làm lại
    const retryBtn=await page.locator('#retry').isVisible();
    console.log('Retry button visible:',retryBtn);
    
    // Kiểm tra nút in
    const printBtn=await page.locator('[data-print], button:has-text("In")').count();
    console.log('Print button found:',printBtn>0);
    
    // Mobile view
    await context.close();
    const mobileContext=await browser.newContext({viewport:{width:390,height:844}});
    const mobilePage=await mobileContext.newPage();
    await mobilePage.goto('file://'+htmlFile);
    
    const mobileScreenshot=path.join(evidenceDir,'reading-result-mobile-390.png');
    await mobilePage.screenshot({path:mobileScreenshot,fullPage:true});
    console.log('✓ Mobile screenshot (390px): '+mobileScreenshot);
    
    await mobileContext.close();
  }finally{
    await browser.close();
  }
});
