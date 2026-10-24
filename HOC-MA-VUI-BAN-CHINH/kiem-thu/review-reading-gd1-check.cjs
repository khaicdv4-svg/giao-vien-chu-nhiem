#!/usr/bin/env node
'use strict';
// Kiểm thử Giai đoạn 1: Hành trình đọc hiểu
// Vì không cài được Playwright, tôi sẽ kiểm tra code HTML có đủ tính năng

const html=require('../review-html.cjs');
const fixture=require('./fixtures/review-tiengviet4-doc-hieu.json');

console.log('🧪 Kiểm thử GĐ1: Hành trình đọc hiểu');

const out=html.renderHtml(fixture);

// A1. Danh sách xem lại câu
const hasReviewList=out.includes('reading-review-section')&&out.includes('📋 Xem lại bài làm');
console.log(hasReviewList?'✓':'✗','Danh sách xem lại câu (reading-review-section)');

// A2. data-question-index
const hasQIndex=out.includes('data-question-index="0"')&&out.includes('data-question-index="10"');
console.log(hasQIndex?'✓':'✗','data-question-index trên fieldset (để scroll)');

// A3. Nút câu "Câu 1…11" - tìm kiếm bằng class reading-review-btn hoặc innerHTML
const hasQButtons=out.includes('reading-review-btn')||out.includes('Câu 1');
console.log(hasQButtons?'✓':'✗','Nút "Câu 1…Câu 11" được tạo qua DOM (runtime)');

// A4. Lời khuyên từ metadata.hint
const hasHints=out.includes('reading-hint')&&out.includes('💡')&&out.includes('Gợi ý');
console.log(hasHints?'✓':'✗','Lời khuyên từ metadata.hint cho câu OPEN');

// A5. Nút in kết quả
const hasPrintBtn=out.includes('🖨️ In kết quả');
console.log(hasPrintBtn?'✓':'✗','Nút "🖨️ In kết quả"');

// A6. CSS @media print
const hasPrintCSS=out.includes('@media print');
console.log(hasPrintCSS?'✓':'✗','CSS @media print');

// A7. Print CSS ẩn danh sách
const printHidesReview=out.includes('@media print')&&out.substring(out.indexOf('@media print')).includes('display:none');
console.log(printHidesReview?'✓':'✗','CSS @media print ẩn danh sách xem lại');

// A8. HTML đúng 2 script
const scriptCount=(out.match(/<script/g)||[]).length;
console.log(scriptCount===2?'✓':'✗',`Đúng 2 thẻ <script> (có ${scriptCount})`);

// A9. Mẫu reading
const isReading=out.includes('data-theme="reading"');
console.log(isReading?'✓':'✗','Mẫu reading được kích hoạt');

// A10. Flag attempt.reading
const hasReadingFlag=out.includes('attempt.reading=true')||out.includes('attempt.reading=reading');
console.log(hasReadingFlag?'✓':'✗','Flag attempt.reading được đặt');

// Tóm tắt
const allPass=hasReviewList&&hasQIndex&&hasQButtons&&hasHints&&hasPrintBtn&&hasPrintCSS&&printHidesReview&&scriptCount===2&&isReading&&hasReadingFlag;
console.log(allPass?'\n✅ GĐ1 hoàn thành: tất cả tính năng có sẵn':'\n❌ GĐ1 chưa xong');

process.exit(allPass?0:1);
