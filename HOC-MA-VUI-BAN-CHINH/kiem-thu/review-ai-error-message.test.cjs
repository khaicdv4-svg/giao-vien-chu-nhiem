const test = require('node:test');
const assert = require('node:assert');

// Hàm đổi lỗi kỹ thuật thành lời báo dễ hiểu
const getErrorMessage = (error) => {
  const status = error.status || 0;
  const code = error.code || '';
  
  if (status === 429) {
    return {
      message: 'AI đang bận, thầy cô chờ khoảng 1 phút rồi bấm lại.',
      action: 'retry'
    };
  }
  if (status >= 500) {
    return {
      message: 'AI đang gặp sự cố, chưa đọc được đề.',
      action: 'retry'
    };
  }
  if (status === 401 || status === 403) {
    return {
      message: 'Chưa có khóa AI hoặc khóa chưa đúng.',
      action: 'get-key'
    };
  }
  if (code === 'AI_TIMEOUT' || /timeout/i.test(String(error))) {
    return {
      message: 'Đề dài nên AI đọc chưa kịp. Thầy cô thử lại, hoặc gợi ý chia nhỏ tệp.',
      action: 'retry'
    };
  }
  if (code === 'AI_BAD_JSON' || /json/i.test(code)) {
    return {
      message: 'AI trả về dữ liệu không đọc được. Đề có thể quá mờ hoặc quá dài, thầy cô thử chia nhỏ.',
      action: 'split'
    };
  }
  if (status === 0) {
    return {
      message: 'Máy đang không có mạng hoặc AI không kết nối được.',
      action: 'retry'
    };
  }
  
  return {
    message: 'AI chưa đọc được đề. Thầy cô thử lại hoặc nhập theo mẫu.',
    action: 'retry'
  };
};

test('GĐ2: Lỗi 429 — lời báo dễ hiểu', () => {
  const err = new Error('Rate limited');
  err.status = 429;
  
  const msg = getErrorMessage(err);
  assert(!msg.message.includes('429'), 'Không hiện mã lỗi');
  assert(msg.message.includes('bận'), 'Lời báo có "bận"');
  assert(msg.action === 'retry', 'Action là retry');
  console.log('✓ 429:', msg.message);
});

test('GĐ2: Lỗi 5xx — lời báo', () => {
  const err = new Error('Server error');
  err.status = 500;
  
  const msg = getErrorMessage(err);
  assert(!msg.message.includes('500'), 'Không hiện mã lỗi');
  assert(msg.message.includes('sự cố'), 'Lời báo có "sự cố"');
  assert(msg.action === 'retry', 'Action là retry');
  console.log('✓ 5xx:', msg.message);
});

test('GĐ2: Lỗi 401/403 (sai khóa) — lời báo', () => {
  const err = new Error('Unauthorized');
  err.status = 401;
  
  const msg = getErrorMessage(err);
  assert(!msg.message.includes('401'), 'Không hiện mã lỗi');
  assert(msg.message.includes('khóa'), 'Lời báo có "khóa"');
  assert(msg.action === 'get-key', 'Action là get-key');
  console.log('✓ 401:', msg.message);
});

test('GĐ2: Lỗi timeout — lời báo', () => {
  const err = new Error('Timeout');
  err.code = 'AI_TIMEOUT';
  
  const msg = getErrorMessage(err);
  assert(!msg.message.includes('TIMEOUT'), 'Không hiện mã lỗi');
  assert(msg.message.includes('dài'), 'Lời báo có "dài"');
  assert(msg.action === 'retry', 'Action là retry');
  console.log('✓ Timeout:', msg.message);
});

test('GĐ2: Lỗi parse JSON — lời báo', () => {
  const err = new Error('Invalid JSON');
  err.code = 'AI_BAD_JSON';
  
  const msg = getErrorMessage(err);
  assert(!msg.message.includes('JSON'), 'Không hiện "JSON"');
  assert(msg.message.includes('mờ'), 'Lời báo có "mờ"');
  assert(msg.action === 'split', 'Action là split');
  console.log('✓ JSON error:', msg.message);
});

test('GĐ2: Lỗi 400 (không retry) — vẫn có lời báo', () => {
  const err = new Error('Bad request');
  err.status = 400;
  
  const msg = getErrorMessage(err);
  assert(msg.message.length > 0, 'Phải có lời báo');
  assert(!msg.message.includes('400'), 'Không hiện mã');
  console.log('✓ 400:', msg.message);
});
