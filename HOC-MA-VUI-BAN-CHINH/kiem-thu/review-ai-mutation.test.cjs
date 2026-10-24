const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Load review-ai.js vào sandbox
const code = fs.readFileSync(path.resolve(__dirname, '../app/review-ai.js'), 'utf-8');

// Tạo mock fetch + sandbox
let callCount401 = 0;
let callCount429 = 0;

const sandbox = {
  console,
  fetch: async (url, opts) => {
    if (url.includes('test-401')) {
      callCount401++;
      const e = new Error('Unauthorized');
      e.status = 401;
      throw e;
    }
    if (url.includes('test-429')) {
      callCount429++;
      if (callCount429 <= 2) {
        const e = new Error('Rate limited');
        e.status = 429;
        throw e;
      }
      return {
        ok: true,
        json: async () => ({ data: { questions: [] }, model: 'test' })
      };
    }
    return {
      ok: true,
      json: async () => ({ data: { questions: [] }, model: 'test' })
    };
  },
  AbortController: class {},
  module: { exports: {} }
};

// Run code
vm.runInNewContext(code, sandbox);
const HmvReviewAi = sandbox.module.exports || sandbox.HmvReviewAi;

if (!HmvReviewAi || !HmvReviewAi.callAI) {
  console.error('❌ Không load được callAI');
  process.exit(1);
}

test('GĐ2 Mutation: 401 không retry (mã đúng) - phải throw ngay', async () => {
  callCount401 = 0;
  let thrown = false;
  try {
    await HmvReviewAi.callAI('test-401', [], {});
  } catch (err) {
    thrown = true;
    assert(err.status === 401 || err.message.includes('Unauthorized'), '401 phải throw');
  }
  assert(thrown, '401 phải throw ngay, không retry');
  assert.equal(callCount401, 1, 'Phải gọi 1 lần, không retry');
  console.log('✓ Mã đúng: 401 throw ngay (1 lần gọi)');
});

test('GĐ2 Mutation: 429 retry - thành công lần 3 (mã đúng)', async () => {
  callCount429 = 0;
  let result;
  try {
    result = await HmvReviewAi.callAI('test-429', [], {});
  } catch (err) {
    assert.fail('429 phải retry: ' + err.message);
  }
  assert(result, '429 phải thành công sau retry');
  assert.equal(callCount429, 3, 'Phải gọi 3 lần (fail 2, thành công 1)');
  console.log('✓ Mã đúng: 429 retry 2 lần, thành công lần 3 (3 lần gọi)');
});
