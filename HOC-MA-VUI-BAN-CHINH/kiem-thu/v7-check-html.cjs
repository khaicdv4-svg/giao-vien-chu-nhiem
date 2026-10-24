'use strict';
// Vòng 7 A: Kiểm tra HTML trả về từ renderHtml()
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const fixture = path.resolve(__dirname, 'fixtures/review-simple-doc-hieu.json');
const app = path.resolve(__dirname, '../app');
const output = path.resolve(process.env.HMV_EVIDENCE_DIR || 'bang-chung-gd1');

// Load modules
const domain_source = fs.readFileSync(path.resolve(app, 'review-domain.js'), 'utf-8');
const html_source = fs.readFileSync(path.resolve(app, 'review-html.js'), 'utf-8');
const fixture_data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));

// Khởi tạo sandbox để gọi hàm
const vm = require('node:vm');
const sandbox = {
  console,
  module: { exports: {} },
  Buffer
};

// Load domain
vm.runInNewContext(domain_source, sandbox);
const domain = sandbox.module.exports;

// Normalize fixture
const attempt = domain.createPractice(fixture_data);
console.log('=== Attempt sau normalize ===');
console.log('Status:', attempt.status);
console.log('HasAttemptLimit:', attempt.metadata?.attemptLimit !== undefined);
console.log('AttemptLimit:', attempt.metadata?.attemptLimit);
console.log('Theme:', attempt.theme);
console.log('Reading:', attempt.reading);

// Load html module
sandbox.module.exports = {};
vm.runInNewContext(html_source, sandbox);
const htmlMod = sandbox.module.exports;

// Gọi renderHtml với attempt đã normalize
const htmlString = htmlMod.renderHtml(attempt, domain_source);

// Kiểm tra HTML
console.log('\n=== HTML String ===');
console.log('Độ dài:', htmlString.length);
console.log('Có <html>:', htmlString.includes('<html'));
console.log('Có <body>:', htmlString.includes('<body'));
console.log('Có id="retry":', htmlString.includes('id="retry"'));
console.log('Có <script>:', (htmlString.match(/<script/g) || []).length, 'tags');

// Ghi HTML ra file để kiểm tra
fs.writeFileSync(path.join(output, 'v7-html-debug.html'), htmlString);
console.log('\n✓ HTML lưu: v7-html-debug.html');
console.log('Kiểm tra: mở file trong trình duyệt để xem nút retry');
