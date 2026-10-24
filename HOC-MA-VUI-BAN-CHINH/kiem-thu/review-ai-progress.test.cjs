const test = require('node:test');
const assert = require('node:assert');

// Hàm báo tiến độ
const reportProgress = (step, current, total, extractedQuestions) => {
  let message = '';
  
  if (step === 'reading') {
    message = `Đang đọc trang ${current}/${total}`;
  } else if (step === 'solving') {
    const missingCount = extractedQuestions.filter(q => !q.correctAnswers || q.correctAnswers.length === 0).length;
    message = `Đang giải ${missingCount} câu thiếu đáp án`;
  } else if (step === 'writing-hints') {
    message = `Đang viết gợi ý`;
  }
  
  return {
    step,
    message,
    progress: Math.round((current / total) * 100) || 100
  };
};

test('GĐ2: Báo tiến độ "Đang đọc trang i/total"', () => {
  const msg = reportProgress('reading', 2, 5);
  assert(msg.message.includes('đọc'), 'Lời báo có "đọc"');
  assert(msg.message.includes('2'), 'Có số trang hiện tại');
  assert(msg.message.includes('5'), 'Có tổng trang');
  assert.equal(msg.progress, 40, 'Progress 2/5 = 40%');
  console.log('✓ Reading:', msg.message);
});

test('GĐ2: Báo tiến độ "Đang giải N câu thiếu đáp án"', () => {
  const questions = [
    { id: 'q1', correctAnswers: ['A'] },
    { id: 'q2', correctAnswers: [] },
    { id: 'q3', correctAnswers: [] },
    { id: 'q4', correctAnswers: ['C'] }
  ];
  
  const msg = reportProgress('solving', 1, 1, questions);
  assert(msg.message.includes('giải'), 'Lời báo có "giải"');
  assert(msg.message.includes('2'), 'Số câu thiếu đáp án là 2');
  assert.equal(msg.progress, 100, 'Bước giải là 100%');
  console.log('✓ Solving:', msg.message);
});

test('GĐ2: Báo tiến độ "Đang viết gợi ý"', () => {
  const msg = reportProgress('writing-hints', 1, 1);
  assert(msg.message.includes('viết'), 'Lời báo có "viết"');
  assert(msg.message.includes('gợi ý'), 'Có "gợi ý"');
  console.log('✓ Writing hints:', msg.message);
});

test('GĐ2: Thứ tự bước: đọc → giải → viết gợi ý', () => {
  const steps = [];
  
  // Giả lập quá trình đọc 3 trang
  for (let i = 1; i <= 3; i++) {
    steps.push(reportProgress('reading', i, 3));
  }
  
  // Giải
  steps.push(reportProgress('solving', 1, 1, []));
  
  // Viết gợi ý
  steps.push(reportProgress('writing-hints', 1, 1));
  
  assert.equal(steps[0].step, 'reading', 'Bước 1 là reading');
  assert.equal(steps[3].step, 'solving', 'Bước 4 là solving');
  assert.equal(steps[4].step, 'writing-hints', 'Bước 5 là writing-hints');
  
  // Kiểm tra progress tăng dần
  assert(steps[0].progress < steps[1].progress, 'Progress tăng khi đọc trang 2');
  
  console.log('✓ Thứ tự bước đúng');
});

test('GĐ2: Progress 100% ở cuối', () => {
  const steps = [];
  
  for (let i = 1; i <= 5; i++) {
    steps.push(reportProgress('reading', i, 5));
  }
  
  assert.equal(steps[steps.length - 1].progress, 100, 'Progress cuối là 100%');
  console.log('✓ Progress 100% ở cuối');
});
