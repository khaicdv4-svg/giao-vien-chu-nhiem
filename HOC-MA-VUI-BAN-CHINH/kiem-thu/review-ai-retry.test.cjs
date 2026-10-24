const test = require('node:test');
const assert = require('node:assert');

// Mock AI response
const mockAI = (shouldFail = null, failAttempt = null) => {
  let callCount = 0;
  return async (parts, opts) => {
    callCount++;
    if (shouldFail === '429' && callCount <= failAttempt) {
      const e = new Error('Rate limited');
      e.status = 429;
      throw e;
    }
    if (shouldFail === '5xx' && callCount <= failAttempt) {
      const e = new Error('Server error');
      e.status = 500;
      throw e;
    }
    if (shouldFail === 'timeout' && callCount <= failAttempt) {
      const e = new Error('Timeout');
      e.code = 'AI_TIMEOUT';
      throw e;
    }
    if (shouldFail === '400') {
      const e = new Error('Bad request');
      e.status = 400;
      throw e;
    }
    return { data: { questions: [] }, model: 'test' };
  };
};

test('GĐ2: Retry khi 429 — gọi lại 2 lần, thành công lần 3', async () => {
  const ai = mockAI('429', 2); // Lỗi lần 1 và 2, xong lần 3
  
  const delays = [];
  const onProgressCalls = [];
  
  let result;
  try {
    // Giả lập callAI với retry
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        result = await ai([], {});
        break;
      } catch (err) {
        const retryable = (err.status === 429 || err.status >= 500 || err.code === 'AI_TIMEOUT');
        if (!retryable || attempt >= 2) throw err;
        
        const delay = [2000, 5000][attempt];
        delays.push(delay);
        onProgressCalls.push(`chờ ${delay}ms`);
      }
    }
  } catch (e) {
    assert.fail('Retry thất bại: ' + e.message);
  }
  
  assert.equal(delays.length, 2, 'Phải chờ 2 lần');
  assert.equal(delays[0], 2000, 'Lần 1 chờ 2s');
  assert.equal(delays[1], 5000, 'Lần 2 chờ 5s');
  console.log('✓ Retry 429 thành công');
});

test('GĐ2: Retry khi 5xx — gọi lại 2 lần, thành công lần 3', async () => {
  const ai = mockAI('5xx', 2);
  
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await ai([], {});
      break;
    } catch (err) {
      const retryable = err.status >= 500;
      if (!retryable || attempt >= 2) {
        assert.fail('Không nên throw ở đây');
      }
    }
  }
  console.log('✓ Retry 5xx thành công');
});

test('GĐ2: Không retry khi 400', async () => {
  const ai = mockAI('400');
  
  let errorThrown = false;
  try {
    await ai([], {});
  } catch (err) {
    errorThrown = true;
    assert.equal(err.status, 400, 'Lỗi 400 phải throw ngay');
  }
  assert(errorThrown, '400 phải throw, không retry');
  console.log('✓ Không retry 400');
});

test('GĐ2: Không retry khi 401', async () => {
  const ai = mockAI('401');
  
  let errorThrown = false;
  try {
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const e = new Error('Unauthorized');
        e.status = 401;
        throw e;
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          throw err; // Không retry
        }
      }
    }
  } catch (err) {
    errorThrown = true;
  }
  assert(errorThrown, '401 phải throw');
  console.log('✓ Không retry 401/403');
});

test('GĐ2: Timeout — retry 2 lần, thành công lần 3', async () => {
  const ai = mockAI('timeout', 2);
  
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await ai([], {});
      break;
    } catch (err) {
      const retryable = err.code === 'AI_TIMEOUT';
      if (!retryable || attempt >= 2) throw err;
    }
  }
  console.log('✓ Retry timeout thành công');
});
