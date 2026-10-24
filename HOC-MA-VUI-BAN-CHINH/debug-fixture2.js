const fs = require('fs');
const domain = require('./app/review-domain.js');

const fixture = JSON.parse(fs.readFileSync('kiem-thu/fixtures/review-simple-doc-hieu.json', 'utf-8'));

console.log('=== Fixture Mới ===');
try {
  const normalized = domain.normalizeDocument(fixture);
  console.log('✓ Normalize OK');
  
  const errors = domain.validateDocument(normalized);
  if (errors.length) {
    console.log('❌ Errors:', errors);
  } else {
    console.log('✓ Validate OK');
    console.log('  Questions:', normalized.questions.length);
    console.log('  Blocks:', normalized.blocks.length);
    console.log('  Status:', normalized.status);
  }
} catch (err) {
  console.error('❌', err.message);
}
