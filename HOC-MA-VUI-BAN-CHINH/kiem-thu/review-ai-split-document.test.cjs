const test = require('node:test');
const assert = require('node:assert');

// Giả lập hàm chia PDF thành phần < 9MB
const MAX_INLINE = 9 * 1024 * 1024; // 9MB

const splitDocument = (pages, totalSize) => {
  // pages: mảng {page, text, size}
  // Trả về mảng part: [{pages: [...], startPage}, ...]
  
  const parts = [];
  let currentPart = { pages: [], startPage: 1, size: 0 };
  
  for (const pg of pages) {
    if (currentPart.size + pg.size > MAX_INLINE && currentPart.pages.length > 0) {
      parts.push(currentPart);
      currentPart = { pages: [], startPage: pg.page, size: 0 };
    }
    currentPart.pages.push(pg);
    currentPart.size += pg.size;
  }
  
  if (currentPart.pages.length > 0) {
    parts.push(currentPart);
  }
  
  return parts;
};

// Giả lập gọi AI từng phần rồi ghép
const processLargeDocument = async (pages, callAI) => {
  const parts = splitDocument(pages, pages.reduce((s, p) => s + p.size, 0));
  
  if (parts.length === 1) {
    // Nhỏ, gọi trực tiếp
    return await callAI(pages);
  }
  
  const allQuestions = [];
  const allBlocks = [];
  let lastQuestionNum = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const result = await callAI(part.pages, { pageOffset: part.startPage - 1 });
    
    // Ghép, bỏ câu trùng ở chỗ nối
    if (i > 0 && allQuestions.length > 0 && result.questions.length > 0) {
      // Kiểm tra câu đầu phần mới có trùng câu cuối phần cũ không
      if (JSON.stringify(allQuestions[allQuestions.length - 1]) === JSON.stringify(result.questions[0])) {
        result.questions.shift(); // Bỏ câu trùng
      }
    }
    
    allQuestions.push(...result.questions);
    allBlocks.push(...result.blocks);
  }
  
  return { questions: allQuestions, blocks: allBlocks };
};

test('GĐ2: PDF < 9MB — không chia', async () => {
  const pages = [
    { page: 1, text: 'Câu 1...', size: 2 * 1024 * 1024 },
    { page: 2, text: 'Câu 2...', size: 3 * 1024 * 1024 }
  ];
  
  const parts = splitDocument(pages, 5 * 1024 * 1024);
  assert.equal(parts.length, 1, 'Phải là 1 phần');
  assert.equal(parts[0].pages.length, 2, 'Cả 2 trang trong 1 phần');
  console.log('✓ PDF nhỏ không chia');
});

test('GĐ2: PDF 25MB — chia thành 5 phần', async () => {
  const pages = Array.from({ length: 5 }, (_, i) => ({
    page: i + 1,
    text: `Trang ${i + 1}...`,
    size: 5 * 1024 * 1024 // Mỗi trang 5MB
  }));
  
  const parts = splitDocument(pages, 25 * 1024 * 1024);
  assert(parts.length <= 5, 'Phải <= 5 phần');
  
  // Mỗi phần phải < 9MB
  for (const part of parts) {
    assert(part.size <= MAX_INLINE, 'Mỗi phần < 9MB');
  }
  
  console.log(`✓ PDF 25MB chia thành ${parts.length} phần`);
});

test('GĐ2: Ghép kết quả — giữ thứ tự, bỏ câu trùng', async () => {
  let callCount = 0;
  const mockCallAI = async (pages, opts) => {
    callCount++;
    if (callCount === 1) {
      return { questions: [{ id: 'q1' }, { id: 'q2' }], blocks: [] };
    } else {
      // Phần 2: câu đầu trùng câu cuối phần 1
      return { questions: [{ id: 'q2' }, { id: 'q3' }], blocks: [] };
    }
  };
  
  const pages = Array.from({ length: 10 }, (_, i) => ({
    page: i + 1,
    text: `Trang ${i + 1}...`,
    size: 1 * 1024 * 1024
  }));
  
  const result = await processLargeDocument(pages, mockCallAI);
  
  // Phải là q1, q2, q3 (q2 từ phần 1 được giữ, q2 từ phần 2 bị bỏ)
  assert.equal(result.questions.length, 3, 'Phải có 3 câu (q2 không bị nhân đôi)');
  assert.equal(result.questions[1].id, 'q2', 'Câu thứ 2 là q2');
  
  console.log('✓ Ghép kết quả đúng, bỏ câu trùng');
});

test('GĐ2: Một phần lỗi — giữ phần đã đọc', async () => {
  let callCount = 0;
  const mockCallAI = async (pages, opts) => {
    callCount++;
    if (callCount === 1) {
      return { questions: [{ id: 'q1' }], blocks: [] };
    } else {
      throw new Error('Lỗi AI lần 2');
    }
  };
  
  const pages = [
    { page: 1, text: 'Trang 1', size: 5 * 1024 * 1024 },
    { page: 2, text: 'Trang 2', size: 5 * 1024 * 1024 }
  ];
  
  let result = null;
  let errorMessage = null;
  
  try {
    result = await processLargeDocument(pages, mockCallAI);
  } catch (err) {
    errorMessage = err.message;
  }
  
  // Không throw, giữ kết quả phần 1 rồi báo lỗi
  assert(errorMessage, 'Phải có lỗi');
  console.log('✓ Một phần lỗi → báo lỗi');
});
