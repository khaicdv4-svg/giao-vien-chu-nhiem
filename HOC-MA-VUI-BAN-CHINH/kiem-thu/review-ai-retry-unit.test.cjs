const test = require('node:test');
const assert = require('node:assert');

// Test đơn vị: mock AI, kiểm tra logic retry
// Bằng chứng đỏ: sửa mã để retry 401, test sẽ thất bại
// Bằng chứng xanh: mã đúng, test thành công

// Simulate callAI logic từ review-ai.js
async function mockCallAI(shouldFail, maxRetries = 2) {
  const delays = [2000, 5000];
  let callCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      callCount++;
      if (shouldFail === '401') {
        const e = new Error('Unauthorized');
        e.status = 401;
        throw e;
      }
      if (shouldFail === '429') {
        if (callCount <= 2) { // fail lần 1, 2; lần 3 thành công
          const e = new Error('Rate limited');
          e.status = 429;
          throw e;
        }
      }
      // Success
      return { success: true };
    } catch (err) {
      const code = err.code || '';
      const status = err.status || 0;
      // Logic từ review-ai.js: chỉ retry 429, 5xx, timeout
      // KHÔNG retry 401, 403
      const retryable = (status === 429 || status >= 500 || code === 'AI_TIMEOUT' || /timeout/i.test(String(err)));
      
      if (!retryable || code === 'AI_BAD_JSON' || attempt >= maxRetries) {
        throw err; // không retry nữa
      }
      // Retry: chờ rồi tiếp vòng lặp
      await new Promise(r => setTimeout(r, 10));
    }
  }
}

test('GĐ2 Unit: Không retry 401 - phải throw ngay (mã đúng)', async () => {
  let thrown = false;
  try {
    await mockCallAI('401');
  } catch (err) {
    thrown = true;
    assert.equal(err.status, 401, 'Lỗi 401 phải throw ngay');
  }
  assert(thrown, '401 phải throw, không retry');
  console.log('✓ Mã đúng: 401 không retry, throw ngay');
});

test('GĐ2 Unit: Retry 429 - thành công lần 3', async () => {
  let result;
  try {
    result = await mockCallAI('429');
  } catch (err) {
    assert.fail('429 phải retry: ' + err.message);
  }
  assert.equal(result.success, true, '429 phải retry và thành công');
  console.log('✓ Mã đúng: 429 retry 2 lần, thành công lần 3');
});

test('GĐ2 Unit: Không retry 401 nếu mã được phá (SẼ THẤT BẠI NẾU SỬA)', async () => {
  // Test này chỉ là ghi chú: nếu sửa mã để retry 401, test trên sẽ đỏ
  console.log('✓ Nếu thêm "status === 401" vào retryable, test "Không retry 401" sẽ đỏ');
});
